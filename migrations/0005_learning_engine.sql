-- Confusion matrix + recall latency
ALTER TABLE game_answers ADD COLUMN selected_character_id INTEGER;
ALTER TABLE game_answers ADD COLUMN elapsed_ms INTEGER;
ALTER TABLE game_answers ADD COLUMN fluency TEXT;

-- Ebbinghaus interval scheduling
ALTER TABLE characters ADD COLUMN next_review_at   TEXT;
ALTER TABLE characters ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE characters ADD COLUMN interval_hours   REAL;

-- Leech detection
ALTER TABLE characters ADD COLUMN is_leech     INTEGER NOT NULL DEFAULT 0 CHECK (is_leech IN (0,1));
ALTER TABLE characters ADD COLUMN leech_streak INTEGER NOT NULL DEFAULT 0;

-- Label custom/preset sessions
ALTER TABLE game_sessions ADD COLUMN preset TEXT;

CREATE INDEX IF NOT EXISTS idx_answers_confusion
  ON game_answers(character_id, selected_character_id) WHERE selected_character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_next_review
  ON characters(next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_leech
  ON characters(is_leech) WHERE is_leech = 1;
CREATE INDEX IF NOT EXISTS idx_answers_character_wrong
  ON game_answers(character_id, is_correct, answered_at);
