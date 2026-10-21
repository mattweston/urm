ALTER TABLE "tags" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;--> statement-breakpoint
ALTER TABLE "entity_tags" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
