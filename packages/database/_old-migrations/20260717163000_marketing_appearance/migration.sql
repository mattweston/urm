-- TODO: Replace the anonymous singleton with domain_id after production domain
-- ownership and organization-scoped media are introduced.
CREATE TABLE "marketing_appearance" (
    "id" varchar(255) PRIMARY KEY NOT NULL,
    "theme" varchar(50) DEFAULT 'system' NOT NULL,
    "background_image_id" varchar(255),
    "updated_at" bigint NOT NULL
);--> statement-breakpoint
ALTER TABLE "marketing_appearance" ADD CONSTRAINT "marketing_appearance_background_image_id_images_id_fkey" FOREIGN KEY ("background_image_id") REFERENCES "images"("id") ON DELETE SET NULL;
