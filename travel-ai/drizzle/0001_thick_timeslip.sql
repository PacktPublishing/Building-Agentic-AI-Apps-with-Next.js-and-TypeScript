ALTER TABLE "trips" ADD COLUMN "num_people" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "departure_city" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "arrival_city" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "departure_date" date;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "stay_duration" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "flights" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "hotels" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "activities" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "status" text DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "thread_id" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "updated_at" timestamp DEFAULT now();