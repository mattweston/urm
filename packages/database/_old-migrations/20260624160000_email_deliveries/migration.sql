CREATE TABLE "email_deliveries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "template_id" varchar(255) NOT NULL,
    "purpose" varchar(255) NOT NULL,
    "provider" varchar(255) NOT NULL,
    "provider_message_id" varchar(255),
    "provider_status" varchar(255),
    "status" varchar(64) DEFAULT 'queued' NOT NULL,
    "contact_id" varchar(255),
    "to_hash" varchar(64) NOT NULL,
    "to_domain" varchar(255),
    "subject" varchar(500) NOT NULL,
    "error_class" varchar(255),
    "error_message" varchar(1000),
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "queued_at" bigint,
    "sent_at" bigint,
    "failed_at" bigint,
    "skipped_at" bigint
);
--> statement-breakpoint
CREATE INDEX "email_deliveries_status_created_idx" ON "email_deliveries" ("status", "created_at");--> statement-breakpoint
CREATE INDEX "email_deliveries_purpose_created_idx" ON "email_deliveries" ("purpose", "created_at");--> statement-breakpoint
CREATE INDEX "email_deliveries_contact_created_idx" ON "email_deliveries" ("contact_id", "created_at");--> statement-breakpoint
CREATE INDEX "email_deliveries_to_hash_created_idx" ON "email_deliveries" ("to_hash", "created_at");--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;
