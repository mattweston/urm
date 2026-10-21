CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"title" text NOT NULL,
	"href" text NOT NULL,
	"tags" text[] NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_domain_href_unique" ON "bookmarks" ("domain_id","href");--> statement-breakpoint
CREATE INDEX "bookmarks_domain_title_idx" ON "bookmarks" ("domain_id","title","id");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;