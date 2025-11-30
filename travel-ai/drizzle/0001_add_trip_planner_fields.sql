-- Migration: Add trip planner workflow fields to trips table
-- Created: 2025-11-30

-- Add new columns for trip planner workflow
ALTER TABLE "trips"
ADD COLUMN IF NOT EXISTS "num_people" integer,
ADD COLUMN IF NOT EXISTS "departure_city" text,
ADD COLUMN IF NOT EXISTS "arrival_city" text,
ADD COLUMN IF NOT EXISTS "departure_date" date,
ADD COLUMN IF NOT EXISTS "stay_duration" integer,
ADD COLUMN IF NOT EXISTS "flights" jsonb,
ADD COLUMN IF NOT EXISTS "hotels" jsonb,
ADD COLUMN IF NOT EXISTS "activities" jsonb,
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS "thread_id" text,
ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_trips_user_status" ON "trips"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_trips_thread_id" ON "trips"("thread_id");
CREATE INDEX IF NOT EXISTS "idx_trips_status" ON "trips"("status");

-- Add comment
COMMENT ON COLUMN "trips"."num_people" IS 'Number of travelers';
COMMENT ON COLUMN "trips"."departure_city" IS 'IATA code of departure city';
COMMENT ON COLUMN "trips"."arrival_city" IS 'IATA code of arrival/destination city';
COMMENT ON COLUMN "trips"."departure_date" IS 'Trip departure date';
COMMENT ON COLUMN "trips"."stay_duration" IS 'Trip duration in days';
COMMENT ON COLUMN "trips"."flights" IS 'JSON array of flight search results';
COMMENT ON COLUMN "trips"."hotels" IS 'JSON array of hotel search results';
COMMENT ON COLUMN "trips"."activities" IS 'JSON array of activity search results';
COMMENT ON COLUMN "trips"."status" IS 'Trip status: draft, confirmed, cancelled';
COMMENT ON COLUMN "trips"."thread_id" IS 'LangGraph workflow thread ID';
COMMENT ON COLUMN "trips"."updated_at" IS 'Last update timestamp';
