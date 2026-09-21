-- Persistent cache for pages fetched from Data18 (survives Worker restarts).
CREATE TABLE IF NOT EXISTS data18_cache (
  cache_key  TEXT PRIMARY KEY,
  body       TEXT NOT NULL,
  expires_at INTEGER NOT NULL  -- epoch milliseconds
);
CREATE INDEX IF NOT EXISTS idx_data18_cache_expires ON data18_cache(expires_at);
