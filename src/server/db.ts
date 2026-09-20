export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
  const result = await stmt.all<T>();
  return result.results;
}

export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
  return stmt.first<T>();
}

export function chunk<T>(items: readonly T[], size = 90): T[][] {
  if (items.length === 0) {
    return [];
  }
  const chunkSize = size < 1 ? 1 : Math.floor(size);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function queryAllChunked<T = Record<string, unknown>>(
  db: D1Database,
  buildQuery: (placeholders: string) => string,
  ids: readonly (string | number)[],
  size = 90
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }
  const chunks = chunk(ids, size);
  const results: T[] = [];
  for (const c of chunks) {
    const placeholders = c.map(() => '?').join(', ');
    const query = buildQuery(placeholders);
    const rows = await queryAll<T>(db, query, ...c);
    results.push(...rows);
  }
  return results;
}
