CREATE TABLE IF NOT EXISTS orchestration_threads (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  pattern text NOT NULL CHECK (pattern IN ('supervisor', 'swarm')),
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orchestration_threads_owner ON orchestration_threads (user_id, pattern, expires_at);
CREATE TABLE IF NOT EXISTS orchestration_daily_usage (
  user_id text NOT NULL,
  day date NOT NULL,
  used integer NOT NULL CHECK (used >= 0),
  PRIMARY KEY (user_id, day)
);
