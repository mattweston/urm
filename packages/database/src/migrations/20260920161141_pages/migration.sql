CREATE TABLE "pages" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"subdomain_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"slug" text,
	"navigation_label" text NOT NULL,
	"show_in_navigation" boolean NOT NULL,
	"order_position" integer NOT NULL,
	"is_homepage" boolean NOT NULL,
	"publication_state" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean NOT NULL,
	"template_source" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pages_root_slug_unique" ON "pages" ("domain_id","slug") WHERE "subdomain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_subdomain_slug_unique" ON "pages" ("domain_id","subdomain_id","slug") WHERE "subdomain_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_root_homepage_unique" ON "pages" ("domain_id") WHERE "subdomain_id" IS NULL AND "is_homepage";--> statement-breakpoint
CREATE UNIQUE INDEX "pages_subdomain_homepage_unique" ON "pages" ("domain_id","subdomain_id") WHERE "subdomain_id" IS NOT NULL AND "is_homepage";--> statement-breakpoint
CREATE INDEX "pages_owner_order_idx" ON "pages" ("domain_id","subdomain_id","order_position","id");--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_domain_id_subdomain_id_subdomains_domain_id_id_fkey" FOREIGN KEY ("domain_id","subdomain_id") REFERENCES "subdomains"("domain_id","id");