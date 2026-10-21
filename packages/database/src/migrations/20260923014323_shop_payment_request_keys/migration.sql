ALTER TABLE "shop_payments" ADD COLUMN "request_key" text;--> statement-breakpoint
UPDATE "shop_payments" SET "request_key" = "id" WHERE "request_key" IS NULL;--> statement-breakpoint
ALTER TABLE "shop_payments" ALTER COLUMN "request_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_domain_order_request_unique" ON "shop_payments" ("domain_id","order_id","request_key");--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_request_key_nonempty" CHECK (length("request_key") BETWEEN 1 AND 255);
