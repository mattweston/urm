CREATE TABLE "publication_deployment_jobs" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"release_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"artifact_checksum" text NOT NULL,
	"url" text,
	"error_message" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "publication_deployment_jobs_key_unique" ON "publication_deployment_jobs" ("domain_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_deployment_jobs_active_unique" ON "publication_deployment_jobs" ("domain_id") WHERE "status" IN ('pending','running');--> statement-breakpoint
CREATE INDEX "publication_deployment_jobs_owner_created_idx" ON "publication_deployment_jobs" ("domain_id","created_at");--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD CONSTRAINT "publication_deployment_jobs_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD CONSTRAINT "publication_deployment_jobs_scLD6HMkqT8N_fkey" FOREIGN KEY ("release_id") REFERENCES "publication_releases"("id");--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD CONSTRAINT "publication_deployment_jobs_requested_by_user_id_users_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id");