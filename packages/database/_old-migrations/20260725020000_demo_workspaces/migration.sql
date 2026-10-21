SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TYPE "demo_workspace_status" AS ENUM ('active', 'expired', 'revoked');
--> statement-breakpoint
CREATE TABLE "demo_workspaces" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" varchar(255) NOT NULL,
    "org_id" uuid NOT NULL,
    "status" "demo_workspace_status" NOT NULL DEFAULT 'active',
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_workspaces_active_contact_unique"
    ON "demo_workspaces" ("contact_id")
    WHERE "status" = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_workspaces_org_unique" ON "demo_workspaces" ("org_id");
--> statement-breakpoint
ALTER TABLE "demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_contact_id_contacts_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "demo_workspaces"
    ADD CONSTRAINT "demo_workspaces_org_id_orgs_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE "demo_workspace_domains" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "domain_id" uuid NOT NULL,
    "scenario" varchar(64) NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_workspace_domains_workspace_scenario_unique"
    ON "demo_workspace_domains" ("workspace_id", "scenario");
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_workspace_domains_domain_unique"
    ON "demo_workspace_domains" ("domain_id");
--> statement-breakpoint
ALTER TABLE "demo_workspace_domains"
    ADD CONSTRAINT "demo_workspace_domains_workspace_id_demo_workspaces_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "demo_workspaces"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "demo_workspace_domains"
    ADD CONSTRAINT "demo_workspace_domains_domain_id_domains_id_fkey"
    FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT;
