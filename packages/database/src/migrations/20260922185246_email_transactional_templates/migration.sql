CREATE TABLE "email_transactional_active" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"template_id" text NOT NULL,
	"active_version" integer NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_transactional_versions" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"template_id" text NOT NULL,
	"version" integer NOT NULL,
	"copy" jsonb NOT NULL,
	"restored_from_version" integer,
	"created_at" bigint NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_transactional_active_unique" ON "email_transactional_active" ("domain_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_transactional_versions_unique" ON "email_transactional_versions" ("domain_id","template_id","version");--> statement-breakpoint
CREATE INDEX "email_transactional_versions_lookup_idx" ON "email_transactional_versions" ("domain_id","template_id","version");--> statement-breakpoint
ALTER TABLE "email_transactional_active" ADD CONSTRAINT "email_transactional_active_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_transactional_active" ADD CONSTRAINT "email_transactional_active_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "email_transactional_versions" ADD CONSTRAINT "email_transactional_versions_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_transactional_versions" ADD CONSTRAINT "email_transactional_versions_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");