CREATE TABLE "internal_document_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_documents" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"domain_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"status" text NOT NULL,
	"template_source" jsonb,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "internal_document_templates_org_updated_idx" ON "internal_document_templates" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "internal_documents_scope_updated_idx" ON "internal_documents" ("organization_id","domain_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "internal_document_templates" ADD CONSTRAINT "internal_document_templates_2mdFLm22Z1nc_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "internal_document_templates" ADD CONSTRAINT "internal_document_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "internal_document_templates" ADD CONSTRAINT "internal_document_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "internal_documents" ADD CONSTRAINT "internal_documents_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "internal_documents" ADD CONSTRAINT "internal_documents_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "internal_documents" ADD CONSTRAINT "internal_documents_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "internal_documents" ADD CONSTRAINT "internal_documents_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");