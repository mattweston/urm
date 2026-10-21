SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE SEQUENCE "orders_number_seq" AS integer;
--> statement-breakpoint
SELECT setval(
    'orders_number_seq',
    COALESCE((SELECT MAX("number") FROM "orders"), 0) + 1,
    false
);
--> statement-breakpoint
ALTER TABLE "orders"
    ALTER COLUMN "number" SET DEFAULT nextval('orders_number_seq'),
    ADD COLUMN "session_id" varchar(255);
--> statement-breakpoint
CREATE INDEX "orders_domain_session_created_idx"
    ON "orders" ("domain_id", "session_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_domain_session_pending_unique"
    ON "orders" ("domain_id", "session_id")
    WHERE "status" = 'pending';
