CREATE TABLE "email_unsubscribe_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "list_key" varchar(255) DEFAULT 'newsletter' NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "expires_at" bigint,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_unsubscribe_tokens_hash_unique" ON "email_unsubscribe_tokens" ("token_hash");-->statement-breakpoint
CREATE INDEX "email_unsubscribe_tokens_contact_list_created_idx" ON "email_unsubscribe_tokens" ("contact_id", "list_key", "created_at");-->statement-breakpoint
ALTER TABLE "email_unsubscribe_tokens" ADD CONSTRAINT "email_unsubscribe_tokens_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
