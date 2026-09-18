-- Rename 'sl' category to 'sluts' or update legacy categories
UPDATE categories SET key = 'sluts', label = 'Sluts' WHERE key = 'sl';
UPDATE categories SET key = 'trans', label = 'Trans' WHERE key = 'male';
UPDATE categories SET key = 'sluts', label = 'Sluts' WHERE key = 'female';
UPDATE categories SET key = 'twinks', label = 'Twinks' WHERE key = 'boys';

INSERT OR IGNORE INTO categories (key, label, sort_order)
VALUES ('trans', 'Trans', 1), ('sluts', 'Sluts', 2), ('twinks', 'Twinks', 3);

-- Recreate game_sessions table to update CHECK constraint on scope
PRAGMA foreign_keys = OFF;

CREATE TABLE game_sessions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK (scope IN ('trans','sluts','twinks','mix')),
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

INSERT INTO game_sessions_new (
  id, scope, mode, planned_rounds, status, started_at, finished_at,
  total_rounds_played, total_correct, total_wrong, remediation_rounds_played
)
SELECT
  id,
  CASE scope
    WHEN 'sl' THEN 'sluts'
    WHEN 'female' THEN 'sluts'
    WHEN 'male' THEN 'trans'
    WHEN 'boys' THEN 'twinks'
    ELSE scope
  END,
  mode, planned_rounds, status, started_at, finished_at,
  total_rounds_played, total_correct, total_wrong, remediation_rounds_played
FROM game_sessions;

DROP TABLE game_sessions;
ALTER TABLE game_sessions_new RENAME TO game_sessions;

PRAGMA foreign_keys = ON;
