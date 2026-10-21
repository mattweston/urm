CREATE TABLE "members" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"first" varchar(255) NOT NULL,
	"last" varchar(255) NOT NULL,
	"twitter" varchar(255),
	"avatar" varchar(2048),
	"notes" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE INDEX "members_domain_updated_idx" ON "members" ("domain_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;