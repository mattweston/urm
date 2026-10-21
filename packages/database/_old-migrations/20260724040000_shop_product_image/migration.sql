SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "products"
    ADD COLUMN "image_id" varchar(255) REFERENCES "images"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "products_image_id_idx" ON "products" ("image_id");
