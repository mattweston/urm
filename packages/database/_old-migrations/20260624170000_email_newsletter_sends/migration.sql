CREATE TABLE "email_newsletter_sends" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "template_id" varchar(255) NOT NULL,
    "subject" varchar(500) NOT NULL,
    "status" varchar(64) DEFAULT 'queued' NOT NULL,
    "created_by_contact_id" varchar(255),
    "approved_contact_count" integer DEFAULT 0 NOT NULL,
    "queued_count" integer DEFAULT 0 NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "skipped_count" integer DEFAULT 0 NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "started_at" bigint,
    "completed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
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
);
--> statement-breakpoint
CREATE INDEX "email_newsletter_sends_status_created_idx" ON "email_newsletter_sends" ("status", "created_at");--> statement-breakpoint
CREATE INDEX "email_newsletter_sends_creator_created_idx" ON "email_newsletter_sends" ("created_by_contact_id", "created_at");--> statement-breakpoint
ALTER TABLE "email_newsletter_sends" ADD CONSTRAINT "email_newsletter_sends_created_by_contact_id_contacts_id_fkey" FOREIGN KEY ("created_by_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscriptions_contact_list_unique" ON "email_subscriptions" ("contact_id", "list_key");--> statement-breakpoint
CREATE INDEX "email_subscriptions_list_status_idx" ON "email_subscriptions" ("list_key", "status");--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD COLUMN "newsletter_send_id" uuid;--> statement-breakpoint
CREATE INDEX "email_deliveries_newsletter_send_created_idx" ON "email_deliveries" ("newsletter_send_id", "created_at");--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_newsletter_send_id_email_newsletter_sends_id_fkey" FOREIGN KEY ("newsletter_send_id") REFERENCES "email_newsletter_sends"("id") ON DELETE SET NULL;
