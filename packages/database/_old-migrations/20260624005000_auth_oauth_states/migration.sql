CREATE TABLE "auth_oauth_states" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider" varchar(64) NOT NULL,
    "state_hash" varchar(64) NOT NULL,
    "code_verifier_hash" varchar(64) NOT NULL,
    "redirect_to" varchar(2048),
    "host" varchar(255),
    "domain_id" uuid,
    "expires_at" bigint NOT NULL,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL,
    "request_ip_hash" varchar(255),
    "user_agent_hash" varchar(255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_oauth_states_state_hash_unique" ON "auth_oauth_states" ("state_hash");
--> statement-breakpoint
CREATE INDEX "auth_oauth_states_provider_created_idx" ON "auth_oauth_states" ("provider", "created_at");
--> statement-breakpoint
ALTER TABLE "auth_oauth_states" ADD CONSTRAINT "auth_oauth_states_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");
