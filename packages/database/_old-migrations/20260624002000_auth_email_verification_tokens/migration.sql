CREATE TABLE "auth_email_verification_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "purpose" varchar(64) NOT NULL DEFAULT 'verify_email',
    "expires_at" bigint NOT NULL,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL,
    "request_ip_hash" varchar(255),
    "user_agent_hash" varchar(255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_email_verification_tokens_hash_unique" ON "auth_email_verification_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_email_verification_tokens_contact_created_idx" ON "auth_email_verification_tokens" ("contact_id", "created_at");--> statement-breakpoint
ALTER TABLE "auth_email_verification_tokens" ADD CONSTRAINT "auth_email_verification_tokens_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
