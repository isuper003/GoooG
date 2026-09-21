import { queryAll } from './db';

interface IdRow {
  id: number;
}

export async function dueIds(db: D1Database, nowIso: string): Promise<number[]> {
  const rows = await queryAll<IdRow>(
    db,
    `SELECT c.id FROM characters c
     WHERE c.is_active = 1
       AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       AND c.next_review_at IS NOT NULL AND c.next_review_at <= ?
     ORDER BY c.next_review_at ASC LIMIT 50`,
    nowIso
  );
  return rows.map((r) => r.id);
}

export async function leechIds(db: D1Database): Promise<number[]> {
  const rows = await queryAll<IdRow>(
    db,
    `SELECT c.id FROM characters c
     WHERE c.is_active = 1
       AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       AND c.is_leech = 1
     ORDER BY c.wrong_count DESC, c.id ASC LIMIT 8`
  );
  return rows.map((r) => r.id);
}

export async function criticalIds(db: D1Database, nowIso: string): Promise<number[]> {
  const rows = await queryAll<IdRow>(
    db,
    `SELECT c.id FROM characters c
     WHERE c.is_active = 1
       AND EXISTS (SELECT 1 FROM character_images ci WHERE ci.character_id = c.id)
       AND (c.is_leech = 1 OR (c.next_review_at IS NOT NULL AND c.next_review_at <= ?))
     ORDER BY c.is_leech DESC, c.next_review_at ASC, c.id ASC LIMIT 50`,
    nowIso
  );
  return rows.map((r) => r.id);
}

export async function quickMixIds(db: D1Database): Promise<number[]> {
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
  const focusIds: number[] = [];
  for (const row of [...missedRows, ...neverTestedRows, ...masteredRows]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      focusIds.push(row.id);
    }
  }
  return focusIds;
}
