import { Hono } from 'hono';
import { queryAll } from '../db';

export interface Bindings {
  DB: D1Database;
}

interface CategoryRow {
  id: number;
  key: string;
  label: string;
  sort_order: number;
}

export interface CategoryItem {
  id: number;
  key: string;
  label: string;
  sortOrder: number;
}

export const categoriesRouter = new Hono<{ Bindings: Bindings }>();

categoriesRouter.get('/', async (c) => {
  const rows = await queryAll<CategoryRow>(
    c.env.DB,
    'SELECT id, key, label, sort_order FROM categories ORDER BY sort_order ASC'
  );

  const categories: CategoryItem[] = rows.map((row) => ({
    id: row.id,
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order,
  }));

  return c.json(categories);
});
