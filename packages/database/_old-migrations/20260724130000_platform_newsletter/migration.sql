CREATE TYPE "platform_newsletter_subscriber_status" AS ENUM ('pending', 'subscribed', 'unsubscribed', 'suppressed');
--> statement-breakpoint
CREATE TYPE "platform_newsletter_token_purpose" AS ENUM ('confirm', 'unsubscribe');
--> statement-breakpoint
CREATE TABLE "platform_newsletter_subscribers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar(255) NOT NULL,
    "name" varchar(255),
    "list_key" varchar(255) NOT NULL DEFAULT 'newsletter',
    "status" "platform_newsletter_subscriber_status" NOT NULL DEFAULT 'pending',
    "source" varchar(255),
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "confirmed_at" bigint,
    "unsubscribed_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_newsletter_subscribers_email_list_unique"
    ON "platform_newsletter_subscribers" ("email", "list_key");
--> statement-breakpoint
CREATE INDEX "platform_newsletter_subscribers_list_status_idx"
    ON "platform_newsletter_subscribers" ("list_key", "status");
--> statement-breakpoint
CREATE TABLE "platform_newsletter_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "subscriber_id" uuid NOT NULL REFERENCES "platform_newsletter_subscribers"("id") ON DELETE CASCADE,
    "purpose" "platform_newsletter_token_purpose" NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "expires_at" bigint NOT NULL,
    "consumed_at" bigint,
    "created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_newsletter_tokens_hash_unique" ON "platform_newsletter_tokens" ("token_hash");
--> statement-breakpoint
CREATE INDEX "platform_newsletter_tokens_subscriber_purpose_created_idx"
    ON "platform_newsletter_tokens" ("subscriber_id", "purpose", "created_at");
--> statement-breakpoint
CREATE TABLE "platform_newsletter_sends" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(255) NOT NULL,
    "subject" varchar(500) NOT NULL,
    "status" varchar(64) NOT NULL DEFAULT 'queued',
    "created_by_contact_id" varchar(255) NOT NULL REFERENCES "contacts"("id") ON DELETE RESTRICT,
    "approved_subscriber_count" integer NOT NULL DEFAULT 0,
    "sent_count" integer NOT NULL DEFAULT 0,
    "failed_count" integer NOT NULL DEFAULT 0,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "completed_at" bigint
);
--> statement-breakpoint
CREATE INDEX "platform_newsletter_sends_status_created_idx"
    ON "platform_newsletter_sends" ("status", "created_at");
--> statement-breakpoint
ALTER TABLE "email_deliveries"
    ADD COLUMN "platform_newsletter_send_id" uuid REFERENCES "platform_newsletter_sends"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "email_deliveries_platform_newsletter_send_created_idx"
    ON "email_deliveries" ("platform_newsletter_send_id", "created_at");
