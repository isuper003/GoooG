import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { queryAll, queryOne } from '../db';
import {
  characterCreateSchema,
  characterUpdateSchema,
  characterActiveSchema,
} from '../../shared/validation';
import type { CharacterDTO, CharacterImageDTO, LabelDTO } from '../../shared/types';
import type { AppEnv } from '../app';

interface CharacterRow {
  id: number;
  name: string;
  category_key: string;
  correct_count: number;
  wrong_count: number;
  srs_level: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface ImageRow {
  id: number;
  character_id: number;
  url: string;
  position: number;
}

interface LabelRow {
  id: number;
  character_id: number;
  name: string;
}

async function resolveLabels(
  db: D1Database,
  labelIds: number[] = [],
  newLabelNames: string[] = []
): Promise<number[]> {
  const resolvedIds = new Set<number>(labelIds);
  for (const rawName of newLabelNames) {
    const trimmed = rawName.trim();
    if (!trimmed) continue;
    await db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)').bind(trimmed).run();
    const row = await queryOne<{ id: number }>(
      db,
      'SELECT id FROM labels WHERE name = ? COLLATE NOCASE',
      trimmed
    );
    if (row) {
      resolvedIds.add(row.id);
    }
  }
  return Array.from(resolvedIds);
}

export async function getCharacterById(db: D1Database, id: number): Promise<CharacterDTO | null> {
  const row = await queryOne<CharacterRow>(
    db,
    `SELECT c.id, c.name, cat.key AS category_key, c.correct_count, c.wrong_count, c.srs_level, c.is_active, c.created_at, c.updated_at
     FROM characters c
     JOIN categories cat ON c.category_id = cat.id
     WHERE c.id = ?`,
    id
  );

  if (!row) {
    return null;
  }

  const [images, labels] = await Promise.all([
    queryAll<CharacterImageDTO>(
      db,
      'SELECT id, url, position FROM character_images WHERE character_id = ? ORDER BY position ASC, id ASC',
      id
    ),
    queryAll<LabelDTO>(
      db,
      'SELECT l.id, l.name FROM labels l JOIN character_labels cl ON l.id = cl.label_id WHERE cl.character_id = ? ORDER BY l.name ASC',
      id
    ),
  ]);

  return {
    id: row.id,
    name: row.name,
    categoryKey: row.category_key,
    labels,
    images,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    srsLevel: row.srs_level,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const charactersRouter = new Hono<AppEnv>();

// GET /api/characters
charactersRouter.get('/', async (c) => {
  const category = c.req.query('category');
  const label = c.req.query('label');
  const search = c.req.query('search');
  const sort = c.req.query('sort') || 'newest';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category && category !== 'mix') {
    conditions.push('cat.key = ?');
    params.push(category);
  }

  if (label) {
    const labelId = Number(label);
    if (!isNaN(labelId)) {
      conditions.push('c.id IN (SELECT character_id FROM character_labels WHERE label_id = ?)');
      params.push(labelId);
    }
  }

  if (search && search.trim().length > 0) {
    conditions.push('c.name LIKE ? COLLATE NOCASE');
    params.push(`%${search.trim()}%`);
  }

  let orderByClause: string;
  switch (sort) {
    case 'category':
      orderByClause = 'ORDER BY cat.sort_order ASC, c.name ASC, c.id ASC';
      break;
    case 'oldest':
      orderByClause = 'ORDER BY c.created_at ASC, c.id ASC';
      break;
    case 'most_correct':
      orderByClause = 'ORDER BY c.correct_count DESC, c.id ASC';
      break;
    case 'least_correct':
      orderByClause = 'ORDER BY c.correct_count ASC, c.id ASC';
      break;
    case 'weakest':
      orderByClause = 'ORDER BY c.srs_level ASC, c.wrong_count DESC, c.id ASC';
      break;
    case 'newest':
    default:
      orderByClause = 'ORDER BY c.created_at DESC, c.id DESC';
      break;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT c.id, c.name, cat.key AS category_key, c.correct_count, c.wrong_count, c.srs_level, c.is_active, c.created_at, c.updated_at
    FROM characters c
    JOIN categories cat ON c.category_id = cat.id
    ${whereClause}
    ${orderByClause}
  `;

  const rows = await queryAll<CharacterRow>(c.env.DB, query, ...params);
  if (rows.length === 0) {
    return c.json([]);
  }

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(', ');

  const [imageRows, labelRows] = await Promise.all([
    queryAll<ImageRow>(
      c.env.DB,
      `SELECT id, character_id, url, position FROM character_images WHERE character_id IN (${placeholders}) ORDER BY position ASC, id ASC`,
      ...ids
    ),
    queryAll<LabelRow>(
      c.env.DB,
      `SELECT l.id, l.name, cl.character_id FROM labels l JOIN character_labels cl ON l.id = cl.label_id WHERE cl.character_id IN (${placeholders}) ORDER BY l.name ASC`,
      ...ids
    ),
  ]);

  const imagesByCharId = new Map<number, CharacterImageDTO[]>();
  for (const img of imageRows) {
    const list = imagesByCharId.get(img.character_id) || [];
    list.push({ id: img.id, url: img.url, position: img.position });
    imagesByCharId.set(img.character_id, list);
  }

  const labelsByCharId = new Map<number, LabelDTO[]>();
  for (const lbl of labelRows) {
    const list = labelsByCharId.get(lbl.character_id) || [];
    list.push({ id: lbl.id, name: lbl.name });
    labelsByCharId.set(lbl.character_id, list);
  }

  const result: CharacterDTO[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryKey: row.category_key,
    labels: labelsByCharId.get(row.id) || [],
    images: imagesByCharId.get(row.id) || [],
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    srsLevel: row.srs_level,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json(result);
});

// GET /api/characters/:id
charactersRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'not_found' }, 404);
  }

  const character = await getCharacterById(c.env.DB, id);
  if (!character) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(character);
});

// POST /api/characters
charactersRouter.post('/', zValidator('json', characterCreateSchema), async (c) => {
  const body = c.req.valid('json');

  const category = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM categories WHERE key = ?',
    body.categoryKey
  );
  if (!category) {
    return c.json({ error: 'unknown_category' }, 400);
  }

  const resolvedLabelIds = await resolveLabels(c.env.DB, body.labelIds, body.newLabelNames);

  const charInsert = await c.env.DB
    .prepare('INSERT INTO characters (name, category_id) VALUES (?, ?) RETURNING id')
    .bind(body.name.trim(), category.id)
    .first<{ id: number }>();

  if (!charInsert) {
    return c.json({ error: 'failed_to_create_character' }, 500);
  }

  const charId = charInsert.id;
  const batchStatements: D1PreparedStatement[] = [];

  const uniqueImages: { url: string }[] = [];
  const seenUrls = new Set<string>();
  for (const img of body.images) {
    const trimmed = img.url.trim();
    if (!seenUrls.has(trimmed)) {
      seenUrls.add(trimmed);
      uniqueImages.push({ url: trimmed });
    }
  }

  uniqueImages.forEach((img, idx) => {
    batchStatements.push(
      c.env.DB.prepare('INSERT INTO character_images (character_id, url, position) VALUES (?, ?, ?)')
        .bind(charId, img.url, idx)
    );
  });

  resolvedLabelIds.forEach((labelId) => {
    batchStatements.push(
      c.env.DB.prepare('INSERT INTO character_labels (character_id, label_id) VALUES (?, ?)')
        .bind(charId, labelId)
    );
  });

  if (batchStatements.length > 0) {
    await c.env.DB.batch(batchStatements);
  }

  const created = await getCharacterById(c.env.DB, charId);
  return c.json(created, 201);
});

// PUT /api/characters/:id
charactersRouter.put('/:id', zValidator('json', characterUpdateSchema), async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'not_found' }, 404);
  }

  const existing = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM characters WHERE id = ?',
    id
  );
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = c.req.valid('json');
  const category = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM categories WHERE key = ?',
    body.categoryKey
  );
  if (!category) {
    return c.json({ error: 'unknown_category' }, 400);
  }

  const resolvedLabelIds = await resolveLabels(c.env.DB, body.labelIds, body.newLabelNames);
  const now = new Date().toISOString();

  const batchStatements: D1PreparedStatement[] = [
    c.env.DB.prepare('DELETE FROM character_images WHERE character_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM character_labels WHERE character_id = ?').bind(id),
    c.env.DB.prepare('UPDATE characters SET name = ?, category_id = ?, updated_at = ? WHERE id = ?')
      .bind(body.name.trim(), category.id, now, id),
  ];

  const uniqueImages: { url: string }[] = [];
  const seenUrls = new Set<string>();
  for (const img of body.images) {
    const trimmed = img.url.trim();
    if (!seenUrls.has(trimmed)) {
      seenUrls.add(trimmed);
      uniqueImages.push({ url: trimmed });
    }
  }

  uniqueImages.forEach((img, idx) => {
    batchStatements.push(
      c.env.DB.prepare('INSERT INTO character_images (character_id, url, position) VALUES (?, ?, ?)')
        .bind(id, img.url, idx)
    );
  });

  resolvedLabelIds.forEach((labelId) => {
    batchStatements.push(
      c.env.DB.prepare('INSERT INTO character_labels (character_id, label_id) VALUES (?, ?)')
        .bind(id, labelId)
    );
  });

  await c.env.DB.batch(batchStatements);

  const updated = await getCharacterById(c.env.DB, id);
  return c.json(updated, 200);
});

// PATCH /api/characters/:id/active
charactersRouter.patch('/:id/active', zValidator('json', characterActiveSchema), async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'not_found' }, 404);
  }

  const existing = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM characters WHERE id = ?',
    id
  );
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }

  const { isActive } = c.req.valid('json');
  const now = new Date().toISOString();

  await c.env.DB.prepare('UPDATE characters SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(isActive ? 1 : 0, now, id)
    .run();

  const updated = await getCharacterById(c.env.DB, id);
  return c.json(updated, 200);
});

// DELETE /api/characters/:id
charactersRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'not_found' }, 404);
  }

  const existing = await queryOne<{ id: number }>(
    c.env.DB,
    'SELECT id FROM characters WHERE id = ?',
    id
  );
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM character_images WHERE character_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM character_labels WHERE character_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM game_answers WHERE character_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM characters WHERE id = ?').bind(id),
  ]);

  return c.json({ ok: true });
});
