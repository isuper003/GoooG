-- Data18 performers / studios / series the user follows.
CREATE TABLE IF NOT EXISTS data18_favorites (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  path               TEXT NOT NULL UNIQUE,  -- canonical site path, e.g. /name/cory-chase
  kind               TEXT NOT NULL CHECK (kind IN ('performer','studio','site','network','series')),
  slug               TEXT NOT NULL,
  name               TEXT NOT NULL,
  last_seen_scene_id TEXT,                  -- newest scene the user has already seen
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
