import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { queryAll, queryOne, queryAllChunked } from '../db';
import {
  gameSessionCreateSchema,
  gameAnswerSchema,
  gameSessionFinishSchema,
} from '../../shared/validation';
import type { GameSessionCreateInput } from '../../shared/validation';
import type {
  GameSessionPoolCharacter,
  GameSessionCreateResponse,
  GameAnswerResponse,
} from '../../shared/types';
import type { AppEnv } from '../app';

interface IdRow {
  id: number;
}

interface CharacterPoolRow {
  id: number;
  name: string;
  srs_level: number;
  correct_count: number;
  wrong_count: number;
  is_leech: number;
  next_review_at: string | null;
}

interface ImageRow {
  character_id: number;
  url: string;
}

interface CharacterStatsRow {
  correct_count: number;
  wrong_count: number;
  srs_level: number;
}

async function resolvePoolIds(
  db: D1Database,
  body: GameSessionCreateInput,
  nowIso: string
): Promise<{ focusIds: number[] | null; candidateIds: number[] }> {
  if (body.characterIds) {
    const rows = await queryAllChunked<IdRow>(
      db,
      (placeholders) =>
        `SELECT c.id FROM characters c
         WHERE c.id IN (${placeholders}) AND c.is_active = 1
           AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)`,
      body.characterIds
    );

    const survivingSet = new Set(rows.map((r) => r.id));
    const orderedIds: number[] = [];
    const seen = new Set<number>();
    for (const id of body.characterIds) {
      if (survivingSet.has(id) && !seen.has(id)) {
        seen.add(id);
        orderedIds.push(id);
      }
    }

    return {
      focusIds: orderedIds,
      candidateIds: [...orderedIds],
    };
  }

  if (body.preset) {
    let focusIds: number[];
    switch (body.preset) {
      case 'due': {
        const rows = await queryAll<IdRow>(
          db,
          `SELECT c.id FROM characters c
           WHERE c.is_active = 1
             AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
             AND c.next_review_at IS NOT NULL AND c.next_review_at <= ?
           ORDER BY c.next_review_at ASC LIMIT 50`,
          nowIso
        );
        focusIds = rows.map((r) => r.id);
        break;
      }
      case 'leech': {
        const rows = await queryAll<IdRow>(
          db,
          `SELECT c.id FROM characters c
           WHERE c.is_active = 1
             AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
             AND c.is_leech = 1
           ORDER BY c.wrong_count DESC, c.id ASC LIMIT 8`
        );
        focusIds = rows.map((r) => r.id);
        break;
      }
      case 'critical': {
        const rows = await queryAll<IdRow>(
          db,
          `SELECT c.id FROM characters c
           WHERE c.is_active = 1
             AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
             AND (c.is_leech = 1 OR (c.next_review_at IS NOT NULL AND c.next_review_at <= ?))
           ORDER BY c.is_leech DESC, c.next_review_at ASC, c.id ASC LIMIT 50`,
          nowIso
        );
        focusIds = rows.map((r) => r.id);
        break;
      }
      case 'quick_mix': {
        const [missedRows, neverTestedRows, masteredRows] = await Promise.all([
          queryAll<IdRow>(
            db,
            `SELECT c.id FROM characters c
             WHERE c.is_active = 1
               AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
               AND EXISTS (SELECT 1 FROM game_answers a WHERE a.character_id = c.id AND a.is_correct = 0)
             ORDER BY (SELECT MAX(a.answered_at) FROM game_answers a
                       WHERE a.character_id = c.id AND a.is_correct = 0) DESC
             LIMIT 5`
          ),
          queryAll<IdRow>(
            db,
            `SELECT c.id FROM characters c
             WHERE c.is_active = 1
               AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
               AND c.correct_count = 0 AND c.wrong_count = 0
             ORDER BY c.created_at DESC, c.id DESC
             LIMIT 3`
          ),
          queryAll<IdRow>(
            db,
            `SELECT c.id FROM characters c
             WHERE c.is_active = 1
               AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
               AND c.srs_level = 5
             ORDER BY RANDOM()
             LIMIT 2`
          ),
        ]);

        const seen = new Set<number>();
        focusIds = [];
        for (const row of [...missedRows, ...neverTestedRows, ...masteredRows]) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            focusIds.push(row.id);
          }
        }
        break;
      }
      default: {
        const _exhaustive: never = body.preset;
        throw new Error(`Unhandled preset: ${_exhaustive}`);
      }
    }

    return {
      focusIds,
      candidateIds: [...focusIds],
    };
  }

  // Branch A — neither characterIds nor preset (the existing path)
  const isMix = body.scope === 'mix';
  const query = isMix
    ? `SELECT c.id
       FROM characters c
       WHERE c.is_active = 1
         AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       ORDER BY c.id ASC`
    : `SELECT c.id
       FROM characters c
       JOIN categories cat ON c.category_id = cat.id
       WHERE cat.key = ?
         AND c.is_active = 1
         AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       ORDER BY c.id ASC`;

  const rows = isMix
    ? await queryAll<IdRow>(db, query)
    : await queryAll<IdRow>(db, query, body.scope);

  return {
    focusIds: null,
    candidateIds: rows.map((r) => r.id),
  };
}

async function padCandidateIds(
  db: D1Database,
  candidateIds: number[],
  focusIds: number[],
  padPoolTo?: number
): Promise<number[]> {
  const padTarget = Math.min(100, padPoolTo ?? Math.max(10, focusIds.length * 2));
  if (candidateIds.length >= padTarget) {
    return candidateIds;
  }

  const limit = padTarget + focusIds.length;
  const fillerRows = await queryAll<IdRow>(
    db,
    `SELECT c.id FROM characters c
     WHERE c.is_active = 1
       AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
     ORDER BY c.srs_level ASC, c.wrong_count DESC, c.id ASC
     LIMIT ?`,
    limit
  );

  const existingIds = new Set(candidateIds);
  const padded = [...candidateIds];
  for (const row of fillerRows) {
    if (!existingIds.has(row.id)) {
      existingIds.add(row.id);
      padded.push(row.id);
      if (padded.length === padTarget) {
        break;
      }
    }
  }

  return padded;
}

async function hydratePool(
  db: D1Database,
  ids: readonly number[]
): Promise<GameSessionPoolCharacter[]> {
  if (ids.length === 0) {
    return [];
  }

  const [characters, imageRows] = await Promise.all([
    queryAllChunked<CharacterPoolRow>(
      db,
      (placeholders) =>
        `SELECT c.id, c.name, c.srs_level, c.correct_count, c.wrong_count, c.is_leech, c.next_review_at
         FROM characters c
         WHERE c.id IN (${placeholders})`,
      ids
    ),
    queryAllChunked<ImageRow>(
      db,
      (placeholders) =>
        `SELECT character_id, url
         FROM character_images
         WHERE character_id IN (${placeholders})
         ORDER BY position ASC, id ASC`,
      ids
    ),
  ]);

  const imagesMap = new Map<number, string[]>();
  for (const img of imageRows) {
    const list = imagesMap.get(img.character_id) ?? [];
    list.push(img.url);
    imagesMap.set(img.character_id, list);
  }

  const charMap = new Map<number, CharacterPoolRow>();
  for (const char of characters) {
    charMap.set(char.id, char);
  }

  const pool: GameSessionPoolCharacter[] = [];
  for (const id of ids) {
    const char = charMap.get(id);
    if (!char) continue;
    pool.push({
      id: char.id,
      name: char.name,
      images: imagesMap.get(char.id) ?? [],
      srsLevel: char.srs_level,
      correctCount: char.correct_count,
      wrongCount: char.wrong_count,
      isLeech: Boolean(char.is_leech),
      nextReviewAt: char.next_review_at ?? null,
    });
  }

  return pool;
}

export const sessionsRouter = new Hono<AppEnv>();

// POST /api/game-sessions
sessionsRouter.post('/', zValidator('json', gameSessionCreateSchema), async (c) => {
  const body = c.req.valid('json');

  // Lazy sweep for abandoned sessions older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await c.env.DB.prepare(
    "UPDATE game_sessions SET status = 'abandoned' WHERE status = 'in_progress' AND started_at < ?"
  )
    .bind(oneHourAgo)
    .run();

  const nowIso = new Date().toISOString();
  const { focusIds, candidateIds: initialCandidateIds } = await resolvePoolIds(
    c.env.DB,
    body,
    nowIso
  );

  const need = body.mode === 'classic' ? 3 : 2;

  if (focusIds !== null && focusIds.length === 0) {
    return c.json(
      {
        error: 'not_enough_characters',
        need,
        have: 0,
      },
      422
    );
  }

  const candidateIds =
    focusIds !== null
      ? await padCandidateIds(c.env.DB, initialCandidateIds, focusIds, body.padPoolTo)
      : initialCandidateIds;

  if (candidateIds.length < need) {
    return c.json(
      {
        error: 'not_enough_characters',
        need,
        have: candidateIds.length,
      },
      422
    );
  }

  const pool = await hydratePool(c.env.DB, candidateIds);

  const preset = body.preset ?? (body.characterIds ? 'custom' : null);
  const sessionRow = await c.env.DB.prepare(
    'INSERT INTO game_sessions (scope, mode, planned_rounds, status, preset) VALUES (?, ?, ?, ?, ?) RETURNING id'
  )
    .bind(body.scope, body.mode, body.plannedRounds ?? null, 'in_progress', preset)
    .first<{ id: number }>();

  if (!sessionRow) {
    return c.json({ error: 'failed_to_create_session' }, 500);
  }

  const response: GameSessionCreateResponse = {
    sessionId: sessionRow.id,
    pool,
    focusIds,
  };

  return c.json(response, 201);
});

// POST /api/game-sessions/:id/answers
sessionsRouter.post('/:id/answers', zValidator('json', gameAnswerSchema), async (c) => {
  const sessionId = Number(c.req.param('id'));
  if (isNaN(sessionId)) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Check if session exists
  const session = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM game_sessions WHERE id = ?',
    sessionId
  );
  if (!session) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = c.req.valid('json');

  // Check if character exists
  const character = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM characters WHERE id = ?',
    body.characterId
  );
  if (!character) {
    return c.json({ error: 'character_not_found' }, 404);
  }

  // Step 1: INSERT OR IGNORE into game_answers
  const insertRes = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO game_answers (
       session_id, character_id, phase, is_correct, round_index, srs_level_before, srs_level_after
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      sessionId,
      body.characterId,
      body.phase,
      body.isCorrect ? 1 : 0,
      body.roundIndex,
      body.srsLevelBefore,
      body.srsLevelAfter
    )
    .run();

  // Step 2: Check meta.changes
  if (insertRes.meta.changes === 1) {
    const now = new Date().toISOString();
    const updatedRow = await c.env.DB.prepare(
      `UPDATE characters
       SET correct_count = correct_count + (CASE WHEN ?1 = 'main' AND ?2 = 1 THEN 1 ELSE 0 END),
           wrong_count   = wrong_count   + (CASE WHEN ?1 = 'main' AND ?2 = 0 THEN 1 ELSE 0 END),
           srs_level = ?3, updated_at = ?4
       WHERE id = ?5 RETURNING correct_count, wrong_count, srs_level`
    )
      .bind(
        body.phase,
        body.isCorrect ? 1 : 0,
        body.srsLevelAfter,
        now,
        body.characterId
      )
      .first<CharacterStatsRow>();

    if (!updatedRow) {
      return c.json({ error: 'failed_to_update_character' }, 500);
    }

    // Update owning game_sessions counters
    if (body.phase === 'main') {
      await c.env.DB.prepare(
        `UPDATE game_sessions
         SET total_rounds_played = total_rounds_played + 1,
             total_correct = total_correct + (CASE WHEN ?1 = 1 THEN 1 ELSE 0 END),
             total_wrong = total_wrong + (CASE WHEN ?1 = 0 THEN 1 ELSE 0 END)
         WHERE id = ?2`
      )
        .bind(body.isCorrect ? 1 : 0, sessionId)
        .run();
    } else {
      await c.env.DB.prepare(
        `UPDATE game_sessions
         SET remediation_rounds_played = remediation_rounds_played + 1
         WHERE id = ?`
      )
        .bind(sessionId)
        .run();
    }

    const response: GameAnswerResponse = {
      correctCount: updatedRow.correct_count,
      wrongCount: updatedRow.wrong_count,
      srsLevel: updatedRow.srs_level,
    };
    return c.json(response, 200);
  }

  // meta.changes === 0: duplicate retry, skip UPDATE and return current state
  const currentRow = await queryOne<CharacterStatsRow>(
    c.env.DB,
    'SELECT correct_count, wrong_count, srs_level FROM characters WHERE id = ?',
    body.characterId
  );

  if (!currentRow) {
    return c.json({ error: 'character_not_found' }, 404);
  }

  const response: GameAnswerResponse = {
    correctCount: currentRow.correct_count,
    wrongCount: currentRow.wrong_count,
    srsLevel: currentRow.srs_level,
  };
  return c.json(response, 200);
});

// POST /api/game-sessions/:id/finish
sessionsRouter.post('/:id/finish', zValidator('json', gameSessionFinishSchema), async (c) => {
  const sessionId = Number(c.req.param('id'));
  if (isNaN(sessionId)) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Check if session exists at all
  const session = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM game_sessions WHERE id = ?',
    sessionId
  );
  if (!session) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = c.req.valid('json');
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE game_sessions
     SET status = 'completed',
         finished_at = ?,
         total_rounds_played = ?,
         total_correct = ?,
         total_wrong = ?,
         remediation_rounds_played = ?
     WHERE id = ? AND status = 'in_progress'`
  )
    .bind(
      now,
      body.totalRoundsPlayed,
      body.totalCorrect,
      body.totalWrong,
      body.remediationRoundsPlayed,
      sessionId
    )
    .run();

  return c.json({ ok: true }, 200);
});
