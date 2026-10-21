CREATE TABLE "email_provider_events" (
	"id" text PRIMARY KEY,
	"provider" "email_provider" NOT NULL,
	"provider_message_id" text NOT NULL,
	"recipient_hash" text NOT NULL,
	"event_type" text NOT NULL,
	"bounce_type" text,
	"occurred_at" bigint NOT NULL,
	"delivery_id" text,
	"applied_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "email_provider_events_recipient_hash_check" CHECK ("recipient_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "email_provider_events_message_pending_idx" ON "email_provider_events" ("provider","provider_message_id","applied_at");--> statement-breakpoint
CREATE INDEX "email_provider_events_delivery_occurred_idx" ON "email_provider_events" ("delivery_id","occurred_at");--> statement-breakpoint
ALTER TABLE "email_provider_events" ADD CONSTRAINT "email_provider_events_delivery_id_email_deliveries_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE SET NULL;