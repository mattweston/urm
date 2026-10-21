SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "org_invitations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
    "email" varchar(255) NOT NULL,
    "role" "org_contact_role" NOT NULL DEFAULT 'member',
    "code_hash" varchar(64) NOT NULL,
    "invited_by_contact_id" varchar(255) NOT NULL REFERENCES "contacts"("id") ON DELETE RESTRICT,
    "expires_at" timestamp NOT NULL,
    "consumed_at" timestamp,
    "revoked_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_invitations_pending_org_email_unique"
    ON "org_invitations" ("org_id", "email")
    WHERE "consumed_at" IS NULL AND "revoked_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "org_invitations_code_hash_unique" ON "org_invitations" ("code_hash");
--> statement-breakpoint
CREATE INDEX "org_invitations_org_created_idx" ON "org_invitations" ("org_id", "created_at");
