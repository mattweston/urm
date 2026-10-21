-- Existing shop data is disposable in this environment.
-- Do not apply this migration where shop history must be retained.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DELETE FROM "payments";
--> statement-breakpoint
DELETE FROM "order_items";
--> statement-breakpoint
DELETE FROM "cart_items";
--> statement-breakpoint
DELETE FROM "orders";
--> statement-breakpoint
DELETE FROM "carts";
--> statement-breakpoint
DELETE FROM "customers";
--> statement-breakpoint
DELETE FROM "product_variants";
--> statement-breakpoint
DELETE FROM "products";
--> statement-breakpoint
DELETE FROM "product_collections";
--> statement-breakpoint
DO $$
DECLARE
    constraint_record record;
    index_record record;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
            AND table_name = 'products'
            AND constraint_type = 'UNIQUE'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.products DROP CONSTRAINT %I',
            constraint_record.constraint_name
        );
    END LOOP;

    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND tablename = 'products'
            AND indexdef LIKE '%UNIQUE%'
            AND indexdef LIKE '%(slug)%'
    LOOP
        EXECUTE format('DROP INDEX public.%I', index_record.indexname);
    END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
    constraint_record record;
    index_record record;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
            AND table_name = 'product_collections'
            AND constraint_type = 'UNIQUE'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.product_collections DROP CONSTRAINT %I',
            constraint_record.constraint_name
        );
    END LOOP;

    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND tablename = 'product_collections'
            AND indexdef LIKE '%UNIQUE%'
            AND indexdef LIKE '%(slug)%'
    LOOP
        EXECUTE format('DROP INDEX public.%I', index_record.indexname);
    END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE
    constraint_record record;
    index_record record;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
            AND table_name = 'orders'
            AND constraint_type = 'UNIQUE'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.orders DROP CONSTRAINT %I',
            constraint_record.constraint_name
        );
    END LOOP;

    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND tablename = 'orders'
            AND indexdef LIKE '%UNIQUE%'
            AND indexdef LIKE '%(number)%'
    LOOP
        EXECUTE format('DROP INDEX public.%I', index_record.indexname);
    END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "products"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "product_collections"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "customers"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "carts"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "orders"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "order_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_product_id_products_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "carts"
    ADD CONSTRAINT "carts_customer_id_customers_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_cart_id_carts_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customer_id_customers_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_order_id_orders_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_order_id_orders_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX "products_domain_slug_unique" ON "products" ("domain_id", "slug");
--> statement-breakpoint
CREATE INDEX "products_domain_updated_idx" ON "products" ("domain_id", "updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_collections_domain_slug_unique"
    ON "product_collections" ("domain_id", "slug");
--> statement-breakpoint
CREATE INDEX "product_collections_domain_updated_idx"
    ON "product_collections" ("domain_id", "updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_domain_email_unique" ON "customers" ("domain_id", "email");
--> statement-breakpoint
CREATE INDEX "customers_domain_updated_idx" ON "customers" ("domain_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "carts_domain_session_idx" ON "carts" ("domain_id", "session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_number_unique" ON "orders" ("domain_id", "number");
--> statement-breakpoint
CREATE INDEX "orders_domain_created_idx" ON "orders" ("domain_id", "created_at");
