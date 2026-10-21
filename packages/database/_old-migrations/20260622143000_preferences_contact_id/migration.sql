ALTER TABLE "preferences"
    ADD COLUMN IF NOT EXISTS "contact_id" varchar(255);

UPDATE "preferences"
SET "contact_id" = "user_id"
WHERE "contact_id" IS NULL;

CREATE INDEX IF NOT EXISTS "preferences_contact_id_idx"
    ON "preferences" ("contact_id");
