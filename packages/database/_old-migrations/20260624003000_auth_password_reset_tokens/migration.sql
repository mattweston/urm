CREATE TABLE "auth_password_reset_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "expires_at" bigint NOT NULL,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL,
    "request_ip_hash" varchar(255),
    "user_agent_hash" varchar(255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_password_reset_tokens_hash_unique" ON "auth_password_reset_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_password_reset_tokens_contact_created_idx" ON "auth_password_reset_tokens" ("contact_id", "created_at");--> statement-breakpoint
ALTER TABLE "auth_password_reset_tokens" ADD CONSTRAINT "auth_password_reset_tokens_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
