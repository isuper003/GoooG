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
