CREATE TYPE "shop_fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TABLE "shop_customers" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"legacy_external_id" text,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"stripe_customer_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	CONSTRAINT "shop_customers_email_normalized" CHECK ("email" = lower(trim("email")))
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_options" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "is_selected" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "is_abandoned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "abandoned_at" bigint;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_options" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fulfillment_status" "shop_fulfillment_status" DEFAULT 'unfulfilled'::"shop_fulfillment_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "legacy_external_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_address" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_charge_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" bigint;--> statement-breakpoint
ALTER TABLE "product_collections" ADD COLUMN "legacy_external_id" text;--> statement-breakpoint
ALTER TABLE "product_collections" ADD COLUMN "deleted_at" bigint;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "legacy_external_id" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price_override" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "options" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "legacy_external_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_legacy_id_unique" ON "orders" ("domain_id","legacy_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_number_unique" ON "orders" ("domain_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_stripe_checkout_unique" ON "orders" ("domain_id","stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_collections_domain_legacy_id_unique" ON "product_collections" ("domain_id","legacy_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_domain_legacy_id_unique" ON "product_variants" ("domain_id","legacy_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_domain_legacy_id_unique" ON "products" ("domain_id","legacy_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_customers_domain_id_unique" ON "shop_customers" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_customers_domain_email_unique" ON "shop_customers" ("domain_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_customers_domain_legacy_id_unique" ON "shop_customers" ("domain_id","legacy_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_customers_domain_stripe_id_unique" ON "shop_customers" ("domain_id","stripe_customer_id");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_domain_id_customer_id_shop_customers_domain_id_id_fkey" FOREIGN KEY ("domain_id","customer_id") REFERENCES "shop_customers"("domain_id","id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_domain_id_customer_id_shop_customers_domain_id_id_fkey" FOREIGN KEY ("domain_id","customer_id") REFERENCES "shop_customers"("domain_id","id");--> statement-breakpoint
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_note_length" CHECK ("note" IS NULL OR length("note") <= 500);--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_abandoned_consistent" CHECK ("is_abandoned" = ("abandoned_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK (("subtotal" IS NULL OR "subtotal" >= 0) AND "tax_amount" >= 0 AND "shipping_amount" >= 0 AND "discount_amount" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_override_nonnegative" CHECK ("price_override" IS NULL OR "price_override" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_discount_range" CHECK ("discount" BETWEEN 0 AND "price");