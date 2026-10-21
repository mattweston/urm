ALTER TABLE "issues" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;--> statement-breakpoint
