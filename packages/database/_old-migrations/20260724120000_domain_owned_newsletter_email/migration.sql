-- Existing newsletter data is disposable in this environment.
-- Auth and account-email deliveries are retained as central operational data.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DELETE FROM "email_unsubscribe_tokens";
--> statement-breakpoint
DELETE FROM "email_subscriptions";
--> statement-breakpoint
DELETE FROM "email_deliveries" WHERE "newsletter_send_id" IS NOT NULL;
--> statement-breakpoint
DELETE FROM "email_newsletter_sends";
--> statement-breakpoint
ALTER TABLE "email_deliveries"
    ADD COLUMN "domain_id" uuid REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "email_newsletter_sends"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "email_subscriptions"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "email_unsubscribe_tokens"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "email_unsubscribe_tokens"
    ADD COLUMN "purpose" varchar(64) NOT NULL DEFAULT 'unsubscribe';
--> statement-breakpoint
DROP INDEX "email_subscriptions_contact_list_unique";
--> statement-breakpoint
DROP INDEX "email_subscriptions_list_status_idx";
--> statement-breakpoint
DROP INDEX "email_unsubscribe_tokens_contact_list_created_idx";
--> statement-breakpoint
CREATE INDEX "email_deliveries_domain_created_idx"
    ON "email_deliveries" ("domain_id", "created_at");
--> statement-breakpoint
CREATE INDEX "email_newsletter_sends_domain_status_created_idx"
    ON "email_newsletter_sends" ("domain_id", "status", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscriptions_domain_contact_list_unique"
    ON "email_subscriptions" ("domain_id", "contact_id", "list_key");
--> statement-breakpoint
CREATE INDEX "email_subscriptions_domain_list_status_idx"
    ON "email_subscriptions" ("domain_id", "list_key", "status");
--> statement-breakpoint
CREATE INDEX "email_unsubscribe_tokens_contact_list_created_idx"
    ON "email_unsubscribe_tokens" ("domain_id", "contact_id", "list_key", "purpose", "created_at");
