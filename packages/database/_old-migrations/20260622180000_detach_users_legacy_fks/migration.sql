ALTER TABLE "auth_accounts"
    DROP CONSTRAINT IF EXISTS "auth_accounts_user_id_users_id_fkey",
    ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "auth_sessions"
    DROP CONSTRAINT IF EXISTS "auth_sessions_user_id_users_id_fkey",
    ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "domains"
    DROP CONSTRAINT IF EXISTS "domains_created_by_id_users_id_fkey";

ALTER TABLE "domain_users"
    DROP CONSTRAINT IF EXISTS "domain_users_user_id_users_id_fkey";

ALTER TABLE "contacts"
    ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "preferences"
    ALTER COLUMN "user_id" DROP NOT NULL;
