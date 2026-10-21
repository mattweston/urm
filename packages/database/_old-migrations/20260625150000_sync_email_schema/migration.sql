ALTER TABLE "email_deliveries" ADD COLUMN IF NOT EXISTS "newsletter_send_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_deliveries_newsletter_send_created_idx" ON "email_deliveries" ("newsletter_send_id", "created_at");--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_deliveries_newsletter_send_id_email_newsletter_sends_id_fkey'
    ) THEN
        ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_newsletter_send_id_email_newsletter_sends_id_fkey"
            FOREIGN KEY ("newsletter_send_id") REFERENCES "email_newsletter_sends"("id") ON DELETE SET NULL;
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "contact_id" varchar(255) NOT NULL,
    "list_key" varchar(255) DEFAULT 'newsletter' NOT NULL,
    "status" varchar(64) DEFAULT 'subscribed' NOT NULL,
    "source" varchar(255),
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "subscribed_at" bigint,
    "unsubscribed_at" bigint
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_subscriptions_contact_list_unique" ON "email_subscriptions" ("contact_id", "list_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_subscriptions_list_status_idx" ON "email_subscriptions" ("list_key", "status");--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_subscriptions_contact_id_contacts_id_fkey'
    ) THEN
        ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_contact_id_contacts_id_fkey"
            FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
    END IF;
END $$;