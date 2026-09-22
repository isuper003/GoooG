-- Data18 scenes and movies saved for later viewing.
CREATE TABLE IF NOT EXISTS data18_watch_later (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type    TEXT NOT NULL CHECK (item_type IN ('scene', 'movie')),
  item_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT,
  url          TEXT NOT NULL,
  image_url    TEXT,
  release_date TEXT,
  duration     TEXT,
  studio_name  TEXT,
  studio_slug  TEXT,
  cast_json    TEXT,
  is_watched   INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  watched_at   TEXT,
  UNIQUE (item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_wl_type ON data18_watch_later(item_type);
CREATE INDEX IF NOT EXISTS idx_wl_watched ON data18_watch_later(is_watched);
CREATE INDEX IF NOT EXISTS idx_wl_created ON data18_watch_later(created_at DESC);
