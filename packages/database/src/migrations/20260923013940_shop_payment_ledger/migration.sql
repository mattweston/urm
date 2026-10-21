CREATE TYPE "shop_payment_event_status" AS ENUM('pending', 'applied', 'ignored');--> statement-breakpoint
CREATE TYPE "shop_payment_status" AS ENUM('reserved', 'checkout_open', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "shop_payment_events" (
	"id" text PRIMARY KEY,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"event_type" text NOT NULL,
	"provider_object_id" text NOT NULL,
	"payload_sha256" text NOT NULL,
	"domain_id" text,
	"payment_id" text,
	"status" "shop_payment_event_status" DEFAULT 'pending'::"shop_payment_event_status" NOT NULL,
	"occurred_at" bigint NOT NULL,
	"received_at" bigint NOT NULL,
	"applied_at" bigint,
	CONSTRAINT "shop_payment_events_provider_check" CHECK ("provider" = 'stripe'),
	CONSTRAINT "shop_payment_events_hash_format" CHECK ("payload_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "shop_payment_events_link_consistent" CHECK (("domain_id" IS NULL) = ("payment_id" IS NULL)),
	CONSTRAINT "shop_payment_events_status_consistent" CHECK (("status" = 'pending') = ("applied_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "shop_payments" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"order_id" text NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_idempotency_key" text NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"status" "shop_payment_status" DEFAULT 'reserved'::"shop_payment_status" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"last_provider_event_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "shop_payments_provider_check" CHECK ("provider" = 'stripe'),
	CONSTRAINT "shop_payments_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "shop_payments_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "shop_payments_idempotency_nonempty" CHECK (length("provider_idempotency_key") BETWEEN 1 AND 255)
);
--> statement-breakpoint
CREATE INDEX "shop_payment_events_provider_object_idx" ON "shop_payment_events" ("provider","provider_object_id","occurred_at");--> statement-breakpoint
CREATE INDEX "shop_payment_events_payment_occurred_idx" ON "shop_payment_events" ("domain_id","payment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_domain_id_unique" ON "shop_payments" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_provider_idempotency_unique" ON "shop_payments" ("provider","provider_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_provider_checkout_unique" ON "shop_payments" ("provider","stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_provider_intent_unique" ON "shop_payments" ("provider","stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "shop_payments_domain_order_created_idx" ON "shop_payments" ("domain_id","order_id","created_at");--> statement-breakpoint
ALTER TABLE "shop_payment_events" ADD CONSTRAINT "shop_payment_events_wOV0mK5LcPTb_fkey" FOREIGN KEY ("domain_id","payment_id") REFERENCES "shop_payments"("domain_id","id");--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_domain_id_order_id_orders_domain_id_id_fkey" FOREIGN KEY ("domain_id","order_id") REFERENCES "orders"("domain_id","id");