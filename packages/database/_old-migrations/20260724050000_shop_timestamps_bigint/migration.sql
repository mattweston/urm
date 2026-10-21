SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "products"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint,
    ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;
--> statement-breakpoint
ALTER TABLE "product_variants"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;
--> statement-breakpoint
ALTER TABLE "product_collections"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint,
    ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;
--> statement-breakpoint
ALTER TABLE "customers"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint,
    ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;
--> statement-breakpoint
ALTER TABLE "carts"
    ALTER COLUMN "last_activity" TYPE bigint USING "last_activity"::bigint,
    ALTER COLUMN "abandoned_at" TYPE bigint USING "abandoned_at"::bigint,
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;
--> statement-breakpoint
ALTER TABLE "cart_items"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;
--> statement-breakpoint
ALTER TABLE "orders"
    ALTER COLUMN "shipped_at" TYPE bigint USING "shipped_at"::bigint,
    ALTER COLUMN "delivered_at" TYPE bigint USING "delivered_at"::bigint,
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint,
    ALTER COLUMN "deleted_at" TYPE bigint USING "deleted_at"::bigint;
--> statement-breakpoint
ALTER TABLE "order_items"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;
--> statement-breakpoint
ALTER TABLE "payments"
    ALTER COLUMN "created_at" TYPE bigint USING "created_at"::bigint,
    ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;
