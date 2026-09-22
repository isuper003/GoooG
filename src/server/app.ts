import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { categoriesRouter } from './routes/categories';
import { charactersRouter } from './routes/characters';
import { labelsRouter } from './routes/labels';
import { previewsRouter } from './routes/previews';
import { sessionsRouter } from './routes/sessions';
import { statsRouter } from './routes/stats';
import { crawlerRouter } from './routes/crawler';
import { proxyRouter } from './routes/proxy';
import { reviewRouter } from './routes/review';
import { data18Router } from './routes/data18';
import { watchRouter } from './routes/watch';
import { rewardClipRouter } from './routes/rewardClip';
import { backupRouter } from './routes/backup';

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    API_WRITE_SECRET: string;
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

// Paths that dump the user's full personal data set: these must stay behind the
// app secret even on GET, since a bare unauthenticated GET could otherwise be
// used to exfiltrate everything just by knowing the URL.
const FULL_DATA_EXPORT_PREFIXES = ['/api/backup', '/api/data18/watch-later/export'];

// Write-protection middleware for mutating endpoints (and full-data exports) under /api
app.use('/api/*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isFullExport = FULL_DATA_EXPORT_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (isMutating || isFullExport) {
    const secret = c.req.header('X-App-Secret');
    if (!secret || secret !== c.env.API_WRITE_SECRET) {
      return c.json({ error: 'unauthorized' }, 401);
    }
  }
  await next();
});

// Mount routes under /api
app.route('/api/categories', categoriesRouter);
app.route('/api/characters', charactersRouter);
app.route('/api/labels', labelsRouter);
app.route('/api/home-previews', previewsRouter);
app.route('/api/game-sessions', sessionsRouter);
app.route('/api/stats', statsRouter);
app.route('/api/crawler', crawlerRouter);
app.route('/api/image-proxy', proxyRouter);
app.route('/api/review', reviewRouter);
app.route('/api/data18', data18Router);
app.route('/api/watch', watchRouter);
app.route('/api/reward-clip', rewardClipRouter);
app.route('/api/backup', backupRouter);

