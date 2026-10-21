ALTER TABLE "todo_list_items"
    ADD COLUMN IF NOT EXISTS "scope_type" varchar(32) NOT NULL DEFAULT 'platform',
    ADD COLUMN IF NOT EXISTS "scope_id" varchar(255),
    ADD COLUMN IF NOT EXISTS "created_by_contact_id" varchar(255),
    ADD COLUMN IF NOT EXISTS "assignee_contact_id" varchar(255),
    ADD COLUMN IF NOT EXISTS "relationship_type" varchar(64);

UPDATE "todo_list_items"
SET
    "created_by_contact_id" = "user_id",
    "assignee_contact_id" = "user_id"
WHERE "user_id" IS NOT NULL
    AND "created_by_contact_id" IS NULL
    AND "assignee_contact_id" IS NULL;

CREATE INDEX IF NOT EXISTS "todo_list_items_scope_idx"
    ON "todo_list_items" ("scope_type", "scope_id");

CREATE INDEX IF NOT EXISTS "todo_list_items_created_by_contact_id_idx"
    ON "todo_list_items" ("created_by_contact_id");

CREATE INDEX IF NOT EXISTS "todo_list_items_assignee_contact_id_idx"
    ON "todo_list_items" ("assignee_contact_id");
