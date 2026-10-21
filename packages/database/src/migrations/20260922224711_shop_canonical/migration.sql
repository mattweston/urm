CREATE TYPE "shop_order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"cart_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_slug" text NOT NULL,
	"product_image_url" text NOT NULL,
	"product_price" integer NOT NULL,
	"variant_name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "cart_items_quantity_range" CHECK ("quantity" BETWEEN 1 AND 20),
	CONSTRAINT "cart_items_price_nonnegative" CHECK ("product_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"session_id" text NOT NULL,
	"contact_id" text,
	"currency" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "carts_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_slug" text NOT NULL,
	"product_image_url" text NOT NULL,
	"product_price" integer NOT NULL,
	"variant_name" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "order_items_quantity_range" CHECK ("quantity" BETWEEN 1 AND 20),
	CONSTRAINT "order_items_price_nonnegative" CHECK ("product_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"cart_id" text NOT NULL,
	"session_id" text NOT NULL,
	"checkout_key" text NOT NULL,
	"email" text NOT NULL,
	"status" "shop_order_status" NOT NULL,
	"total_price" integer NOT NULL,
	"currency" text NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "orders_total_nonnegative" CHECK ("total_price" >= 0),
	CONSTRAINT "orders_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "product_collection_memberships" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"product_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_collections" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "product_collections_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"price" integer NOT NULL,
	"currency" text NOT NULL,
	"stock" integer NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "product_variants_price_nonnegative" CHECK ("price" >= 0),
	CONSTRAINT "product_variants_stock_nonnegative" CHECK ("stock" >= 0),
	CONSTRAINT "product_variants_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"image_url" text NOT NULL,
	"image_id" text,
	"is_active" boolean NOT NULL,
	"is_featured" boolean NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "products_price_nonnegative" CHECK ("price" >= 0),
	CONSTRAINT "products_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_unique" ON "cart_items" ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_updated_idx" ON "cart_items" ("cart_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "cart_items_domain_updated_idx" ON "cart_items" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_domain_id_unique" ON "carts" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_domain_session_unique" ON "carts" ("domain_id","session_id");--> statement-breakpoint
CREATE INDEX "carts_contact_updated_idx" ON "carts" ("contact_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_id_unique" ON "orders" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_checkout_key_unique" ON "orders" ("domain_id","checkout_key");--> statement-breakpoint
CREATE INDEX "orders_domain_updated_idx" ON "orders" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "orders_domain_session_updated_idx" ON "orders" ("domain_id","session_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_collection_memberships_pair_unique" ON "product_collection_memberships" ("product_id","collection_id");--> statement-breakpoint
CREATE INDEX "product_collection_memberships_domain_updated_idx" ON "product_collection_memberships" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "product_collection_memberships_collection_updated_idx" ON "product_collection_memberships" ("collection_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_collections_domain_id_unique" ON "product_collections" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_collections_domain_slug_unique" ON "product_collections" ("domain_id","slug");--> statement-breakpoint
CREATE INDEX "product_collections_domain_updated_idx" ON "product_collections" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_domain_product_id_unique" ON "product_variants" ("domain_id","product_id","id");--> statement-breakpoint
CREATE INDEX "product_variants_domain_updated_idx" ON "product_variants" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "product_variants_product_updated_idx" ON "product_variants" ("product_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_domain_id_unique" ON "products" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_domain_slug_unique" ON "products" ("domain_id","slug");--> statement-breakpoint
CREATE INDEX "products_domain_updated_idx" ON "products" ("domain_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_domain_id_cart_id_carts_domain_id_id_fkey" FOREIGN KEY ("domain_id","cart_id") REFERENCES "carts"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_jGiqY6JBHwbw_fkey" FOREIGN KEY ("domain_id","product_id","variant_id") REFERENCES "product_variants"("domain_id","product_id","id");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_domain_id_order_id_orders_domain_id_id_fkey" FOREIGN KEY ("domain_id","order_id") REFERENCES "orders"("domain_id","id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_collection_memberships" ADD CONSTRAINT "product_collection_memberships_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_collection_memberships" ADD CONSTRAINT "product_collection_memberships_ctA4TpGnji1L_fkey" FOREIGN KEY ("domain_id","product_id") REFERENCES "products"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_collection_memberships" ADD CONSTRAINT "product_collection_memberships_HMzKbqHvkk83_fkey" FOREIGN KEY ("domain_id","collection_id") REFERENCES "product_collections"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_lRrqEwkpIuLh_fkey" FOREIGN KEY ("domain_id","product_id") REFERENCES "products"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;