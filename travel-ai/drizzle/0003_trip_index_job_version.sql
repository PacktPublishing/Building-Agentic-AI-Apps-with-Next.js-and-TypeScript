ALTER TABLE "trip_index_jobs" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
