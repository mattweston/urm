-- Existing media and appearance content is disposable in this environment.
-- Do not apply this migration where that content must be retained.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
-- Dropping a table may break existing clients.
DROP TABLE "marketing_appearance";
--> statement-breakpoint
-- A DELETE without a WHERE clause will remove all rows from the table.
DELETE FROM "images";
--> statement-breakpoint
-- Adding a column with a foreign key constraint requires a table scan and locks.
ALTER TABLE "images"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- Running statement while holding ACCESS EXCLUSIVE lock.
CREATE INDEX "images_domain_updated_idx" ON "images" ("domain_id", "updated_at");
--> statement-breakpoint
-- Running statement while holding ACCESS EXCLUSIVE lock.
CREATE TABLE "marketing_appearance" (
    "domain_id" uuid PRIMARY KEY REFERENCES "domains"("id") ON DELETE CASCADE,
    "theme" varchar(50) NOT NULL DEFAULT 'system',
    "font_preset" varchar(50) NOT NULL DEFAULT 'Theme',
    "background_image_id" varchar(255) REFERENCES "images"("id") ON DELETE SET NULL,
    "updated_at" bigint NOT NULL
);
