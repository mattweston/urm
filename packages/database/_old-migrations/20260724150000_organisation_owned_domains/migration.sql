SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "org_domains"
        WHERE "deleted_at" IS NULL
            AND "relationship" = 'owner'
        GROUP BY "domain_id"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot assign a single organisation to domains with multiple active owner organisations';
    END IF;
END $$;
--> statement-breakpoint
UPDATE "domains" AS domain
SET "org_id" = org_domain."org_id"
FROM "org_domains" AS org_domain
WHERE domain."id" = org_domain."domain_id"
    AND org_domain."deleted_at" IS NULL
    AND org_domain."relationship" = 'owner';
--> statement-breakpoint
INSERT INTO "orgs" ("name", "slug", "kind")
SELECT
    domain."name",
    'legacy-domain-' || replace(domain."id"::text, '-', ''),
    'customer'
FROM "domains" AS domain
WHERE domain."org_id" IS NULL;
--> statement-breakpoint
UPDATE "domains" AS domain
SET "org_id" = org."id"
FROM "orgs" AS org
WHERE domain."org_id" IS NULL
    AND org."slug" = 'legacy-domain-' || replace(domain."id"::text, '-', '');
--> statement-breakpoint
CREATE TYPE "org_contact_role" AS ENUM ('owner', 'admin', 'member');
--> statement-breakpoint
CREATE TYPE "org_contact_status" AS ENUM ('active', 'suspended');
--> statement-breakpoint
ALTER TABLE "org_contacts" ALTER COLUMN "role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "org_contacts"
    ALTER COLUMN "role" TYPE "org_contact_role"
    USING CASE
        WHEN "role" IN ('owner', 'admin', 'member') THEN "role"::"org_contact_role"
        ELSE 'member'::"org_contact_role"
    END;
--> statement-breakpoint
ALTER TABLE "org_contacts" ALTER COLUMN "role" SET DEFAULT 'member';
--> statement-breakpoint
ALTER TABLE "org_contacts" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "org_contacts"
    ALTER COLUMN "status" TYPE "org_contact_status"
    USING CASE
        WHEN "status" IN ('active', 'suspended') THEN "status"::"org_contact_status"
        ELSE 'active'::"org_contact_status"
    END;
--> statement-breakpoint
ALTER TABLE "org_contacts" ALTER COLUMN "status" SET DEFAULT 'active';
--> statement-breakpoint
INSERT INTO "org_contacts" ("org_id", "contact_id", "role", "status")
SELECT domain."org_id", admin."contact_id", 'owner', 'active'
FROM "domains" AS domain
INNER JOIN "domain_admin" AS admin ON admin."domain_id" = domain."id"
WHERE admin."role" = 'owner'
    AND admin."status" = 'active'
    AND admin."deleted_at" IS NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "org_contacts" ("org_id", "contact_id", "role", "status")
SELECT domain."org_id", domain."created_by_contact_id", 'owner', 'active'
FROM "domains" AS domain
WHERE domain."created_by_contact_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "org_contacts" AS membership
SET
    "role" = 'owner',
    "status" = 'active',
    "updated_at" = now()
FROM (
    SELECT domain."org_id", admin."contact_id"
    FROM "domains" AS domain
    INNER JOIN "domain_admin" AS admin ON admin."domain_id" = domain."id"
    WHERE admin."role" = 'owner'
        AND admin."status" = 'active'
        AND admin."deleted_at" IS NULL

    UNION

    SELECT "org_id", "created_by_contact_id"
    FROM "domains"
    WHERE "created_by_contact_id" IS NOT NULL
) AS owner_contacts
WHERE membership."org_id" = owner_contacts."org_id"
    AND membership."contact_id" = owner_contacts."contact_id"
    AND membership."deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "orgs"
    ADD COLUMN "max_domains" integer NOT NULL DEFAULT 1
    CHECK ("max_domains" > 0);
--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "domains"
    ADD CONSTRAINT "domains_org_id_orgs_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "domains_org_updated_idx" ON "domains" ("org_id", "updated_at");
--> statement-breakpoint
DROP TABLE "org_domains";
