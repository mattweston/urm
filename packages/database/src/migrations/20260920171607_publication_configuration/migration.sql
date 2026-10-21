CREATE TABLE "publication_configurations" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"subdomain_id" text,
	"layout" jsonb,
	"navigation" jsonb DEFAULT '[]' NOT NULL,
	"blog_included" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "publication_configurations_root_unique" ON "publication_configurations" ("domain_id") WHERE "subdomain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_configurations_subdomain_unique" ON "publication_configurations" ("domain_id","subdomain_id") WHERE "subdomain_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "publication_configurations" ADD CONSTRAINT "publication_configurations_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "publication_configurations" ADD CONSTRAINT "publication_configurations_60IUaGzQX6iB_fkey" FOREIGN KEY ("domain_id","subdomain_id") REFERENCES "subdomains"("domain_id","id");