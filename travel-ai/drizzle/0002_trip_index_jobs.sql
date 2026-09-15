CREATE TABLE IF NOT EXISTS "trip_index_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" uuid NOT NULL UNIQUE REFERENCES "trips"("id"),
  "operation" text NOT NULL DEFAULT 'upsert',
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "available_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "trip_index_jobs_pending_idx" ON "trip_index_jobs" ("status", "available_at");
