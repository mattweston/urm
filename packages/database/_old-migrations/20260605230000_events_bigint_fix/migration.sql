ALTER TABLE "events" ALTER COLUMN "date" TYPE bigint USING "date"::bigint;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;--> statement-breakpoint
ALTER TABLE "event_menu_items" ALTER COLUMN "order_position" TYPE bigint USING "order_position"::bigint;--> statement-breakpoint
ALTER TABLE "event_menu_items" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;--> statement-breakpoint
ALTER TABLE "event_menu_items" ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;--> statement-breakpoint
