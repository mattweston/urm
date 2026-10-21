ALTER TABLE "contacts" ADD COLUMN "image" varchar(2048);--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_test_contact" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "created_at" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "contacts" SET "created_at" = "updated_at" WHERE "created_at" = 0;--> statement-breakpoint
INSERT INTO "contacts" (
    "id",
    "name",
    "email",
    "image",
    "email_verified",
    "is_test_contact",
    "user_id",
    "created_at",
    "updated_at"
)
SELECT
    "users"."id",
    "users"."name",
    "users"."email",
    "users"."image",
    "users"."email_verified",
    "users"."is_test_user",
    "users"."id",
    "users"."updated_at",
    "users"."updated_at"
FROM "users"
ON CONFLICT ("id") DO UPDATE SET
    "email_verified" = EXCLUDED."email_verified",
    "is_test_contact" = EXCLUDED."is_test_contact",
    "image" = EXCLUDED."image";--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_unique" ON "contacts" ("email") WHERE "email" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "contact_id" varchar(255);--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "contact_id" varchar(255);--> statement-breakpoint
UPDATE "auth_accounts" SET "contact_id" = "user_id" WHERE "contact_id" IS NULL;--> statement-breakpoint
UPDATE "auth_sessions" SET "contact_id" = "user_id" WHERE "contact_id" IS NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE TYPE "platform_admin_role" AS ENUM('sysadmin', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "platform_admin_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "domain_admin_role" AS ENUM('owner', 'admin', 'editor', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "domain_admin_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "platform_admin" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" varchar(255) NOT NULL,
    "role" "platform_admin_role" DEFAULT 'sysadmin' NOT NULL,
    "status" "platform_admin_status" DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admin_contact_unique" ON "platform_admin" ("contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "platform_admin" ADD CONSTRAINT "platform_admin_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO "platform_admin" ("contact_id", "role", "status")
SELECT "users"."id", 'sysadmin', 'active'
FROM "users"
WHERE "users"."role" = 'admin'
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "created_by_contact_id" varchar(255);--> statement-breakpoint
UPDATE "domains" SET "created_by_contact_id" = "created_by_id" WHERE "created_by_contact_id" IS NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_created_by_contact_id_contacts_id_fkey" FOREIGN KEY ("created_by_contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
CREATE TABLE "domain_contacts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "domain_id" uuid NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "status" varchar(64) DEFAULT 'active' NOT NULL,
    "source" varchar(64),
    "newsletter_status" varchar(64) DEFAULT 'not_subscribed' NOT NULL,
    "first_seen_at" timestamp,
    "last_seen_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "domain_contacts_domain_contact_unique" ON "domain_contacts" ("domain_id", "contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "domain_contacts" ADD CONSTRAINT "domain_contacts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_contacts" ADD CONSTRAINT "domain_contacts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO "domain_contacts" ("domain_id", "contact_id", "source")
SELECT "domain_users"."domain_id", "domain_users"."user_id", 'domain_users'
FROM "domain_users"
WHERE "domain_users"."deleted_at" IS NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE TABLE "domain_admin" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "domain_id" uuid NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "role" "domain_admin_role" DEFAULT 'admin' NOT NULL,
    "status" "domain_admin_status" DEFAULT 'active' NOT NULL,
    "invited_by_contact_id" varchar(255),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "domain_admin_domain_contact_unique" ON "domain_admin" ("domain_id", "contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "domain_admin" ADD CONSTRAINT "domain_admin_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_admin" ADD CONSTRAINT "domain_admin_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_admin" ADD CONSTRAINT "domain_admin_invited_by_contact_id_contacts_id_fkey" FOREIGN KEY ("invited_by_contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
INSERT INTO "domain_admin" ("domain_id", "contact_id", "role", "status")
SELECT
    "domain_users"."domain_id",
    "domain_users"."user_id",
    CASE "domain_users"."role"
        WHEN 'owner' THEN 'owner'::"domain_admin_role"
        ELSE 'admin'::"domain_admin_role"
    END,
    'active'
FROM "domain_users"
WHERE "domain_users"."deleted_at" IS NULL
  AND "domain_users"."role" IN ('owner', 'admin')
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE TABLE "domain_visitors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "domain_id" uuid NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "role" varchar(64) DEFAULT 'visitor' NOT NULL,
    "status" varchar(64) DEFAULT 'active' NOT NULL,
    "first_seen_at" timestamp DEFAULT now() NOT NULL,
    "last_seen_at" timestamp,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "domain_visitors_domain_contact_unique" ON "domain_visitors" ("domain_id", "contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "domain_visitors" ADD CONSTRAINT "domain_visitors_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_visitors" ADD CONSTRAINT "domain_visitors_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE TABLE "domain_customers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "domain_id" uuid NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "role" varchar(64) DEFAULT 'customer' NOT NULL,
    "status" varchar(64) DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "domain_customers_domain_contact_unique" ON "domain_customers" ("domain_id", "contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "domain_customers" ADD CONSTRAINT "domain_customers_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_customers" ADD CONSTRAINT "domain_customers_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE TABLE "orgs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL UNIQUE,
    "kind" varchar(64) DEFAULT 'customer' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE TABLE "org_domains" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" uuid NOT NULL,
    "domain_id" uuid NOT NULL,
    "relationship" varchar(64) DEFAULT 'owner' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "org_domains_org_domain_unique" ON "org_domains" ("org_id", "domain_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "org_domains" ADD CONSTRAINT "org_domains_org_id_orgs_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "org_domains" ADD CONSTRAINT "org_domains_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE TABLE "org_contacts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" uuid NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "role" varchar(64) DEFAULT 'member' NOT NULL,
    "status" varchar(64) DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "org_contacts_org_contact_unique" ON "org_contacts" ("org_id", "contact_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "org_contacts" ADD CONSTRAINT "org_contacts_org_id_orgs_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "org_contacts" ADD CONSTRAINT "org_contacts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
