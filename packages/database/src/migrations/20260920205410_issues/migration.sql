CREATE TABLE "issues" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"status" text NOT NULL,
	"priority" text,
	"assignee_id" text,
	"order_position" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "issues_domain_order_idx" ON "issues" ("domain_id","order_position","id");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;