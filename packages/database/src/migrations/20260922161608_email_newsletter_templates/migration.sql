CREATE TABLE "email_newsletter_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"subject" text NOT NULL,
	"headline" text NOT NULL,
	"body_text" text NOT NULL,
	"cta_url" text,
	"cta_label" text,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_newsletter_templates_org_updated_idx" ON "email_newsletter_templates" ("organization_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "email_newsletter_templates" ADD CONSTRAINT "email_newsletter_templates_2USElWmZyrTt_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_newsletter_templates" ADD CONSTRAINT "email_newsletter_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "email_newsletter_templates" ADD CONSTRAINT "email_newsletter_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");