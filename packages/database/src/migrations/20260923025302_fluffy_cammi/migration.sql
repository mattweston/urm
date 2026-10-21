CREATE TABLE "form_fields" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"form_id" text NOT NULL,
	"component_id" text NOT NULL,
	"kind" text NOT NULL,
	"href" text,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"placeholder" text NOT NULL,
	"required" boolean NOT NULL,
	"options" jsonb NOT NULL,
	"order_position" integer NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "form_fields_order_check" CHECK ("order_position" BETWEEN 0 AND 99)
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"fields" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "form_templates_revision_check" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submission_count" integer DEFAULT 0 NOT NULL,
	"template_source" jsonb,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "forms_status_check" CHECK ("status" IN ('draft','published')),
	CONSTRAINT "forms_submission_count_check" CHECK ("submission_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_form_order_unique" ON "form_fields" ("form_id","order_position");--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_form_component_unique" ON "form_fields" ("form_id","component_id");--> statement-breakpoint
CREATE INDEX "form_fields_domain_form_idx" ON "form_fields" ("domain_id","form_id","order_position");--> statement-breakpoint
CREATE INDEX "form_templates_org_updated_idx" ON "form_templates" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "forms_domain_id_unique" ON "forms" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "forms_domain_slug_unique" ON "forms" ("domain_id","slug");--> statement-breakpoint
CREATE INDEX "forms_domain_updated_idx" ON "forms" ("domain_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_domain_id_form_id_forms_domain_id_id_fkey" FOREIGN KEY ("domain_id","form_id") REFERENCES "forms"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;