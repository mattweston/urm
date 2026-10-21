ALTER TABLE "csv_uploads" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
ALTER TABLE "csv_data" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
