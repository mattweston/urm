CREATE TABLE "publication_releases" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"subdomain_id" text,
	"created_by_user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"artifact_checksum" text,
	"error_message" text,
	"created_at" bigint NOT NULL,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "publication_releases_root_key_unique" ON "publication_releases" ("domain_id","idempotency_key") WHERE "subdomain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_releases_subdomain_key_unique" ON "publication_releases" ("domain_id","subdomain_id","idempotency_key") WHERE "subdomain_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "publication_releases_owner_created_idx" ON "publication_releases" ("domain_id","subdomain_id","created_at","id");--> statement-breakpoint
ALTER TABLE "publication_releases" ADD CONSTRAINT "publication_releases_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "publication_releases" ADD CONSTRAINT "publication_releases_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "publication_releases" ADD CONSTRAINT "publication_releases_U0UUG8AUQF5U_fkey" FOREIGN KEY ("domain_id","subdomain_id") REFERENCES "subdomains"("domain_id","id");