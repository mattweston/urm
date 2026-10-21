CREATE TYPE "email_delivery_status" AS ENUM('pending', 'accepted', 'queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "email_provider" AS ENUM('cloudflare', 'bento');--> statement-breakpoint
CREATE TYPE "email_send_status" AS ENUM('draft', 'queued', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "email_stream_status" AS ENUM('pending', 'verifying', 'verified', 'failed', 'disabled');--> statement-breakpoint
CREATE TYPE "email_subscription_status" AS ENUM('subscribed', 'unsubscribed', 'suppressed');--> statement-breakpoint
CREATE TABLE "domain_email_streams" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"kind" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"sending_label" text NOT NULL,
	"status" "email_stream_status" NOT NULL,
	"provider_reference" text,
	"verified_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "domain_email_streams_kind_check" CHECK ("kind" in ('transactional', 'bulk')),
	CONSTRAINT "domain_email_streams_label_check" CHECK ("sending_label" in ('mail', 'newsletter'))
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" text PRIMARY KEY,
	"domain_id" text,
	"contact_id" text,
	"newsletter_send_id" text,
	"template_id" text NOT NULL,
	"transactional_template_version" integer,
	"is_test" boolean,
	"purpose" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"provider_message_id" text,
	"provider_status" text,
	"status" "email_delivery_status" NOT NULL,
	"to_hash" text NOT NULL,
	"to_domain" text,
	"subject" text NOT NULL,
	"error_class" text,
	"error_message" text,
	"idempotency_key" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"accepted_at" bigint,
	"queued_at" bigint,
	"sent_at" bigint,
	"delivered_at" bigint,
	"failed_at" bigint,
	"skipped_at" bigint,
	CONSTRAINT "email_deliveries_send_domain_check" CHECK ("newsletter_send_id" is null or "domain_id" is not null),
	CONSTRAINT "email_deliveries_purpose_check" CHECK ("purpose" in ('newsletter', 'transactional')),
	CONSTRAINT "email_deliveries_hash_check" CHECK ("to_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "email_newsletter_drafts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"headline" text NOT NULL,
	"body_text" text NOT NULL,
	"cta_url" text,
	"cta_label" text,
	"list_key" text NOT NULL,
	"template_source" jsonb,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_newsletter_sends" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"draft_id" text,
	"name" text NOT NULL,
	"template_id" text NOT NULL,
	"publication_theme" jsonb,
	"subject" text NOT NULL,
	"list_key" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"audience" text,
	"idempotency_key" text,
	"headline" text,
	"body_text" text,
	"cta_url" text,
	"cta_label" text,
	"authoring_template_source" jsonb,
	"delivery_template_source" jsonb,
	"status" "email_send_status" NOT NULL,
	"approved_contact_count" integer NOT NULL,
	"accepted_count" integer NOT NULL,
	"queued_count" integer NOT NULL,
	"sent_count" integer NOT NULL,
	"failed_count" integer NOT NULL,
	"skipped_count" integer NOT NULL,
	"error_message" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"started_at" bigint,
	"completed_at" bigint,
	CONSTRAINT "email_newsletter_sends_audience_check" CHECK ("audience" in ('test', 'subscribers'))
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"list_key" text NOT NULL,
	"status" "email_subscription_status" NOT NULL,
	"source" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"subscribed_at" bigint,
	"unsubscribed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "email_unsubscribe_tokens" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"list_key" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	"used_at" bigint,
	CONSTRAINT "email_unsubscribe_tokens_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "domain_email_streams_domain_kind_unique" ON "domain_email_streams" ("domain_id","kind");--> statement-breakpoint
CREATE INDEX "domain_email_streams_status_updated_idx" ON "domain_email_streams" ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_idempotency_unique" ON "email_deliveries" ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_deliveries_domain_created_idx" ON "email_deliveries" ("domain_id","created_at","id");--> statement-breakpoint
CREATE INDEX "email_deliveries_contact_created_idx" ON "email_deliveries" ("contact_id","created_at","id");--> statement-breakpoint
CREATE INDEX "email_deliveries_send_created_idx" ON "email_deliveries" ("newsletter_send_id","created_at","id");--> statement-breakpoint
CREATE INDEX "email_deliveries_provider_message_idx" ON "email_deliveries" ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_status_created_idx" ON "email_deliveries" ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_newsletter_drafts_id_domain_unique" ON "email_newsletter_drafts" ("id","domain_id");--> statement-breakpoint
CREATE INDEX "email_newsletter_drafts_domain_updated_idx" ON "email_newsletter_drafts" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_newsletter_sends_id_domain_unique" ON "email_newsletter_sends" ("id","domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_newsletter_sends_domain_request_unique" ON "email_newsletter_sends" ("domain_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "email_newsletter_sends_domain_created_idx" ON "email_newsletter_sends" ("domain_id","created_at","id");--> statement-breakpoint
CREATE INDEX "email_newsletter_sends_domain_status_created_idx" ON "email_newsletter_sends" ("domain_id","status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscriptions_domain_contact_list_unique" ON "email_subscriptions" ("domain_id","contact_id","list_key");--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscriptions_identity_unique" ON "email_subscriptions" ("id","domain_id","contact_id","list_key");--> statement-breakpoint
CREATE INDEX "email_subscriptions_domain_list_updated_idx" ON "email_subscriptions" ("domain_id","list_key","updated_at","id");--> statement-breakpoint
CREATE INDEX "email_subscriptions_domain_list_status_updated_idx" ON "email_subscriptions" ("domain_id","list_key","status","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_unsubscribe_tokens_hash_unique" ON "email_unsubscribe_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "email_unsubscribe_tokens_domain_created_idx" ON "email_unsubscribe_tokens" ("domain_id","created_at","id");--> statement-breakpoint
ALTER TABLE "domain_email_streams" ADD CONSTRAINT "domain_email_streams_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_UvFF8sqlOsYX_fkey" FOREIGN KEY ("newsletter_send_id","domain_id") REFERENCES "email_newsletter_sends"("id","domain_id");--> statement-breakpoint
ALTER TABLE "email_newsletter_drafts" ADD CONSTRAINT "email_newsletter_drafts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_newsletter_sends" ADD CONSTRAINT "email_newsletter_sends_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_newsletter_sends" ADD CONSTRAINT "email_newsletter_sends_qeDT9aWLS4ma_fkey" FOREIGN KEY ("draft_id","domain_id") REFERENCES "email_newsletter_drafts"("id","domain_id");--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_unsubscribe_tokens" ADD CONSTRAINT "email_unsubscribe_tokens_ajYkAHgEgtRf_fkey" FOREIGN KEY ("subscription_id","domain_id","contact_id","list_key") REFERENCES "email_subscriptions"("id","domain_id","contact_id","list_key") ON DELETE CASCADE;