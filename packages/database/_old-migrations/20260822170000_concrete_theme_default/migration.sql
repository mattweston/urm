UPDATE "preferences"
SET "theme" = 'light'
WHERE "theme" = 'system';
--> statement-breakpoint

UPDATE "marketing_appearance"
SET "theme" = 'light'
WHERE "theme" = 'system';
--> statement-breakpoint

ALTER TABLE "preferences"
ALTER COLUMN "theme" SET DEFAULT 'light';
--> statement-breakpoint

ALTER TABLE "marketing_appearance"
ALTER COLUMN "theme" SET DEFAULT 'light';
