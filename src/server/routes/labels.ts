import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { queryAll, queryOne } from '../db';
import { labelCreateSchema } from '../../shared/validation';
import type { LabelDTO } from '../../shared/types';
import type { AppEnv } from '../app';

export const labelsRouter = new Hono<AppEnv>();

// GET /api/labels -> LabelDTO[], ordered by name
labelsRouter.get('/', async (c) => {
  const rows = await queryAll<LabelDTO>(
    c.env.DB,
    'SELECT id, name FROM labels ORDER BY name ASC'
  );
  return c.json(rows);
});

// POST /api/labels -> 201 with created label, or 409 { error: "label_exists" }
labelsRouter.post('/', zValidator('json', labelCreateSchema), async (c) => {
  const { name } = c.req.valid('json');
  const trimmed = name.trim();

  // Check if a case-insensitive match already exists
  const existing = await queryOne<LabelDTO>(
    c.env.DB,
    'SELECT id, name FROM labels WHERE name = ? COLLATE NOCASE',
    trimmed
  );
  if (existing) {
    return c.json({ error: 'label_exists' }, 409);
  }

  try {
    const created = await c.env.DB
      .prepare('INSERT INTO labels (name) VALUES (?) RETURNING id, name')
      .bind(trimmed)
      .first<LabelDTO>();

    if (!created) {
      return c.json({ error: 'failed_to_create_label' }, 500);
    }
    return c.json(created, 201);
  } catch (err: unknown) {
    const errorStr = String(err);
    if (errorStr.includes('UNIQUE') || errorStr.includes('constraint')) {
      return c.json({ error: 'label_exists' }, 409);
    }
    throw err;
  }
});

// DELETE /api/labels/:id -> { ok: true }
labelsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ ok: true });
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM character_labels WHERE label_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM labels WHERE id = ?').bind(id),
  ]);

  return c.json({ ok: true });
});
