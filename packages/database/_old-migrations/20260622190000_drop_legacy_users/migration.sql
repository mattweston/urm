DROP TABLE IF EXISTS "domain_users";

ALTER TABLE "auth_accounts"
    ALTER COLUMN "contact_id" SET NOT NULL;

ALTER TABLE "auth_sessions"
    ALTER COLUMN "contact_id" SET NOT NULL;

ALTER TABLE "preferences"
    ALTER COLUMN "contact_id" SET NOT NULL;

ALTER TABLE "domains"
    ALTER COLUMN "created_by_contact_id" SET NOT NULL;

ALTER TABLE "auth_accounts"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "auth_sessions"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "contacts"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "preferences"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "todo_list_items"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "carts"
    DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "domains"
    DROP COLUMN IF EXISTS "created_by_id";

DROP TABLE IF EXISTS "users";
