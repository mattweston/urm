CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"excerpt" text,
	"seo_title" text,
	"seo_description" text,
	"editorial_state" text NOT NULL,
	"template_source" jsonb,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"excerpt" text,
	"seo_title" text,
	"seo_description" text,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_blog_posts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"subdomain_id" text,
	"blog_post_id" text NOT NULL,
	"slug" text NOT NULL,
	"publication_state" text NOT NULL,
	"published_at" bigint,
	"is_featured" boolean NOT NULL,
	"order_position" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subdomains" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"status" "publication_status" NOT NULL,
	"access" "publication_access" NOT NULL,
	"expires_at" bigint,
	"live_release_id" text,
	"live_deployment_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_domain_id_unique" ON "blog_posts" ("domain_id","id");--> statement-breakpoint
CREATE INDEX "blog_posts_domain_updated_idx" ON "blog_posts" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "blog_templates_org_updated_idx" ON "blog_templates" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_blog_root_slug_unique" ON "publication_blog_posts" ("domain_id","slug") WHERE "subdomain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_blog_subdomain_slug_unique" ON "publication_blog_posts" ("domain_id","subdomain_id","slug") WHERE "subdomain_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_blog_root_post_unique" ON "publication_blog_posts" ("domain_id","blog_post_id") WHERE "subdomain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_blog_subdomain_post_unique" ON "publication_blog_posts" ("domain_id","subdomain_id","blog_post_id") WHERE "subdomain_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "publication_blog_owner_order_idx" ON "publication_blog_posts" ("domain_id","subdomain_id","order_position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subdomains_domain_slug_unique" ON "subdomains" ("domain_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "subdomains_domain_id_unique" ON "subdomains" ("domain_id","id");--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "blog_templates" ADD CONSTRAINT "blog_templates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blog_templates" ADD CONSTRAINT "blog_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "blog_templates" ADD CONSTRAINT "blog_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "publication_blog_posts" ADD CONSTRAINT "publication_blog_posts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "publication_blog_posts" ADD CONSTRAINT "publication_blog_posts_RJsh9HU3Fsx2_fkey" FOREIGN KEY ("domain_id","blog_post_id") REFERENCES "blog_posts"("domain_id","id");--> statement-breakpoint
ALTER TABLE "publication_blog_posts" ADD CONSTRAINT "publication_blog_posts_lBwgNr7Ugzls_fkey" FOREIGN KEY ("domain_id","subdomain_id") REFERENCES "subdomains"("domain_id","id");--> statement-breakpoint
ALTER TABLE "subdomains" ADD CONSTRAINT "subdomains_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;