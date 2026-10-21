CREATE TABLE "social_accounts" (
	"domain_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_profile_id" text NOT NULL,
	"platform" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"active" boolean NOT NULL,
	"synced_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_analytics_snapshots" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"period" text NOT NULL,
	"platform" text NOT NULL,
	"account_key" text NOT NULL,
	"account_id" text,
	"post_count" integer NOT NULL,
	"metrics" jsonb NOT NULL,
	"follower_growth" double precision NOT NULL,
	"daily" jsonb NOT NULL,
	"platform_breakdown" jsonb NOT NULL,
	"top_posts" jsonb NOT NULL,
	"warning" text,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "social_analytics_period_check" CHECK ("period" IN ('7d','30d','90d')),
	CONSTRAINT "social_analytics_post_count_check" CHECK ("post_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "social_post_edits" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"post_id" text NOT NULL,
	"content" text NOT NULL,
	"account_ids" text[] NOT NULL,
	"media_ids" text[] NOT NULL,
	"media_urls" text[] NOT NULL,
	"platforms" jsonb NOT NULL,
	"scheduled_for" bigint,
	"test_mode" boolean,
	"template_source" jsonb,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"provider_post_id" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content" text NOT NULL,
	"account_ids" text[] NOT NULL,
	"media_ids" text[] NOT NULL,
	"media_urls" text[] NOT NULL,
	"platforms" jsonb NOT NULL,
	"scheduled_for" bigint,
	"error_message" text,
	"test_mode" boolean NOT NULL,
	"template_source" jsonb,
	"created_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "social_posts_status_check" CHECK ("status" IN ('pending','submitting','draft','scheduled','published','partial','failed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "social_provider_profiles" (
	"domain_id" text PRIMARY KEY,
	"provider_profile_id" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_templates" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"content" text NOT NULL,
	"revision" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "social_templates_revision_check" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_domain_account_unique" ON "social_accounts" ("domain_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_provider_account_unique" ON "social_accounts" ("account_id");--> statement-breakpoint
CREATE INDEX "social_accounts_domain_synced_idx" ON "social_accounts" ("domain_id","synced_at","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_analytics_domain_filter_unique" ON "social_analytics_snapshots" ("domain_id","period","platform","account_key");--> statement-breakpoint
CREATE UNIQUE INDEX "social_post_edits_domain_post_unique" ON "social_post_edits" ("domain_id","post_id");--> statement-breakpoint
CREATE INDEX "social_post_edits_domain_updated_idx" ON "social_post_edits" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_domain_id_unique" ON "social_posts" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_domain_key_unique" ON "social_posts" ("domain_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_provider_id_unique" ON "social_posts" ("provider_post_id");--> statement-breakpoint
CREATE INDEX "social_posts_domain_created_idx" ON "social_posts" ("domain_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_provider_profiles_domain_provider_unique" ON "social_provider_profiles" ("domain_id","provider_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_provider_profiles_provider_unique" ON "social_provider_profiles" ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "social_templates_org_updated_idx" ON "social_templates" ("organization_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_BFyqh3PFUID3_fkey" FOREIGN KEY ("domain_id","provider_profile_id") REFERENCES "social_provider_profiles"("domain_id","provider_profile_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_analytics_snapshots" ADD CONSTRAINT "social_analytics_snapshots_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_post_edits" ADD CONSTRAINT "social_post_edits_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "social_provider_profiles" ADD CONSTRAINT "social_provider_profiles_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_templates" ADD CONSTRAINT "social_templates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_templates" ADD CONSTRAINT "social_templates_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "social_templates" ADD CONSTRAINT "social_templates_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");