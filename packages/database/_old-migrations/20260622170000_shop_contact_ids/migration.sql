ALTER TABLE "carts"
    ADD COLUMN IF NOT EXISTS "contact_id" varchar(255);

ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "contact_id" varchar(255);

UPDATE "carts"
SET "contact_id" = "user_id"
WHERE "contact_id" IS NULL
    AND "user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "carts_contact_id_idx"
    ON "carts" ("contact_id");

CREATE INDEX IF NOT EXISTS "customers_contact_id_idx"
    ON "customers" ("contact_id");
