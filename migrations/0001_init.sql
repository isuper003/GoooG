CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  srs_level INTEGER NOT NULL DEFAULT 0 CHECK (srs_level BETWEEN 0 AND 5),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_characters_category ON characters(category_id);

CREATE TABLE character_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (character_id, position),
  UNIQUE (character_id, url)
);
CREATE INDEX idx_images_character ON character_images(character_id, position);

CREATE TABLE labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE character_labels (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (character_id, label_id)
);
CREATE INDEX idx_character_labels_label ON character_labels(label_id);

CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK (scope IN ('male','female','boys','mix')),
  mode TEXT NOT NULL CHECK (mode IN ('classic','match')),
  planned_rounds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT,
  total_rounds_played INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_wrong INTEGER NOT NULL DEFAULT 0,
  remediation_rounds_played INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE game_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('main','remediation')),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0,1)),
  round_index INTEGER NOT NULL,
  srs_level_before INTEGER NOT NULL,
  srs_level_after INTEGER NOT NULL,
  answered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (session_id, phase, round_index)
);
CREATE INDEX idx_answers_session ON game_answers(session_id);
CREATE INDEX idx_answers_character ON game_answers(character_id);
