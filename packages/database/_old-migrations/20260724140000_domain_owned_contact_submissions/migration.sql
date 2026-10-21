CREATE TABLE "contact_submissions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE,
    "contact_id" varchar(255) NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "message" varchar(5000) NOT NULL,
    "status" varchar(64) NOT NULL DEFAULT 'new',
    "source" varchar(64) NOT NULL DEFAULT 'public_contact_form',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    "read_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "contact_submissions_domain_status_created_idx"
    ON "contact_submissions" ("domain_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX "contact_submissions_contact_created_idx"
    ON "contact_submissions" ("contact_id", "created_at");
