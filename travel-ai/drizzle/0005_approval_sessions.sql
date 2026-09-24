ALTER TABLE orchestration_threads DROP CONSTRAINT IF EXISTS orchestration_threads_pattern_check;
ALTER TABLE orchestration_threads ADD CONSTRAINT orchestration_threads_pattern_check
  CHECK (pattern IN ('supervisor', 'swarm', 'approval'));
