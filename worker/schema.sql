CREATE TABLE IF NOT EXISTS readings (
  frozen_id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL UNIQUE,
  source_text TEXT NOT NULL,
  model TEXT NOT NULL,
  reasoning_effort TEXT NOT NULL,
  method_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_response_id TEXT,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reading_claims (
  request_hash TEXT PRIMARY KEY,
  claimed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
  anonymous_daily_key TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anonymous_daily_key, day)
);

CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  frozen_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('correct','partial','wrong')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (frozen_id) REFERENCES readings(frozen_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_frozen_id ON feedback(frozen_id);
