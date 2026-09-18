import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { queryAll, queryOne } from '../db';
import {
  gameSessionCreateSchema,
  gameAnswerSchema,
  gameSessionFinishSchema,
} from '../../shared/validation';
import type {
  GameSessionPoolCharacter,
  GameSessionCreateResponse,
  GameAnswerResponse,
} from '../../shared/types';
import type { AppEnv } from '../app';

interface CharacterPoolRow {
  id: number;
  name: string;
  srs_level: number;
  correct_count: number;
  wrong_count: number;
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

  // Query eligible characters with at least 1 image
  const isMix = body.scope === 'mix';
  const query = isMix
    ? `SELECT c.id, c.name, c.srs_level, c.correct_count, c.wrong_count
       FROM characters c
       WHERE c.is_active = 1
         AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       ORDER BY c.id ASC`
    : `SELECT c.id, c.name, c.srs_level, c.correct_count, c.wrong_count
       FROM characters c
       JOIN categories cat ON c.category_id = cat.id
       WHERE cat.key = ?
         AND c.is_active = 1
         AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       ORDER BY c.id ASC`;

  const characters = isMix
    ? await queryAll<CharacterPoolRow>(c.env.DB, query)
    : await queryAll<CharacterPoolRow>(c.env.DB, query, body.scope);

  const need = body.mode === 'classic' ? 3 : 2;
  if (characters.length < need) {
    return c.json(
      {
        error: 'not_enough_characters',
        need,
        have: characters.length,
      },
      422
    );
  }

  // Fetch images for all characters in pool
  const charIds = characters.map((char) => char.id);
  const placeholders = charIds.map(() => '?').join(', ');
  const imageRows = await queryAll<ImageRow>(
    c.env.DB,
    `SELECT character_id, url FROM character_images WHERE character_id IN (${placeholders}) ORDER BY position ASC, id ASC`,
    ...charIds
  );

  const imagesMap = new Map<number, string[]>();
  for (const img of imageRows) {
    const list = imagesMap.get(img.character_id) || [];
    list.push(img.url);
    imagesMap.set(img.character_id, list);
  }

  const pool: GameSessionPoolCharacter[] = characters.map((char) => ({
    id: char.id,
    name: char.name,
    images: imagesMap.get(char.id) || [],
    srsLevel: char.srs_level,
    correctCount: char.correct_count,
    wrongCount: char.wrong_count,
  }));

  const sessionRow = await c.env.DB.prepare(
    'INSERT INTO game_sessions (scope, mode, planned_rounds, status) VALUES (?, ?, ?, ?) RETURNING id'
  )
    .bind(body.scope, body.mode, body.plannedRounds ?? null, 'in_progress')
    .first<{ id: number }>();

  if (!sessionRow) {
    return c.json({ error: 'failed_to_create_session' }, 500);
  }

  const response: GameSessionCreateResponse = {
    sessionId: sessionRow.id,
    pool,
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
