CREATE TABLE "projects" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"order" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"order" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_domain_slug_unique" ON "projects" ("domain_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_domain_id_unique" ON "projects" ("domain_id","id");--> statement-breakpoint
CREATE INDEX "projects_domain_order_idx" ON "projects" ("domain_id","order","id");--> statement-breakpoint
CREATE INDEX "tasks_project_order_idx" ON "tasks" ("domain_id","project_id","order","id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_domain_id_project_id_projects_domain_id_id_fkey" FOREIGN KEY ("domain_id","project_id") REFERENCES "projects"("domain_id","id") ON DELETE CASCADE;