SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "auth_domain_handoffs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "code_hash" varchar(64) NOT NULL,
    "contact_id" varchar(255) NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE,
    "hostname" varchar(255) NOT NULL,
    "target_route" varchar(2048) NOT NULL,
    "expires_at" bigint NOT NULL,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_domain_handoffs_code_hash_unique" ON "auth_domain_handoffs" ("code_hash");
--> statement-breakpoint
CREATE INDEX "auth_domain_handoffs_domain_created_idx" ON "auth_domain_handoffs" ("domain_id", "created_at");
--> statement-breakpoint
ALTER TABLE "auth_sessions"
    ADD COLUMN "domain_id" uuid,
    ADD COLUMN "hostname" varchar(255),
    ADD COLUMN "cookie_domain" varchar(255),
    ADD CONSTRAINT "auth_sessions_domain_id_domains_id_fkey"
        FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE NOT VALID;
