CREATE TABLE "landing_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"tags" text[],
	"document" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "landing_templates_revision_check" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "logos" (
	"id" text PRIMARY KEY,
	"domain_id" text,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"scene" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "logos_revision_check" CHECK ("revision" >= 1),
	CONSTRAINT "logos_name_length_check" CHECK (length("name") BETWEEN 1 AND 160)
);
--> statement-breakpoint
CREATE INDEX "landing_templates_org_updated_idx" ON "landing_templates" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "logos_domain_updated_idx" ON "logos" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "logos_org_updated_idx" ON "logos" ("organization_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "landing_templates" ADD CONSTRAINT "landing_templates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "landing_templates" ADD CONSTRAINT "landing_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "landing_templates" ADD CONSTRAINT "landing_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");