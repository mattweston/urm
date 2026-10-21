CREATE TABLE "auth_password_credentials" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" varchar(255) NOT NULL,
    "password_hash" varchar(512) NOT NULL,
    "algorithm" varchar(64) NOT NULL,
    "parameters" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "disabled_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_password_credentials_contact_unique" ON "auth_password_credentials" ("contact_id") WHERE "disabled_at" is null;--> statement-breakpoint
ALTER TABLE "auth_password_credentials" ADD CONSTRAINT "auth_password_credentials_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;
