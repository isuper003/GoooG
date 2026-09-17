import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { categoriesRouter } from './routes/categories';

export type AppEnv = {
  Bindings: {
    DB: D1Database;
  };
};

export const app = new Hono<AppEnv>();

// JSON error-handling middleware that prevents leaking stack traces
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled server error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// JSON 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Mount routes under /api
app.route('/api/categories', categoriesRouter);
