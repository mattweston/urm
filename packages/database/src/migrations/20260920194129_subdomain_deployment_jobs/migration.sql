DROP INDEX "publication_deployment_jobs_active_unique";--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD COLUMN "subdomain_id" text;--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD COLUMN "is_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_deployment_jobs_root_active_unique" ON "publication_deployment_jobs" ("domain_id") WHERE "subdomain_id" IS NULL AND "status" IN ('pending','running');--> statement-breakpoint
CREATE UNIQUE INDEX "publication_deployment_jobs_subdomain_active_unique" ON "publication_deployment_jobs" ("domain_id","subdomain_id") WHERE "subdomain_id" IS NOT NULL AND "status" IN ('pending','running');--> statement-breakpoint
ALTER TABLE "publication_deployment_jobs" ADD CONSTRAINT "publication_deployment_jobs_g1WUf0Jvz99i_fkey" FOREIGN KEY ("domain_id","subdomain_id") REFERENCES "subdomains"("domain_id","id");