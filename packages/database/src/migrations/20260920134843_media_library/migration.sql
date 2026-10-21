CREATE TABLE "entity_tags" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"text" text NOT NULL,
	"width" double precision,
	"height" double precision,
	"category" text,
	"order_position" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"description" text,
	"kind" text,
	"target_key" text,
	"deleted_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"embed_url" text NOT NULL,
	"thumbnail_src" text NOT NULL,
	"youtube_id" text,
	"order_position" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "entity_tags_link_unique" ON "entity_tags" ("domain_id","entity_type","entity_id","tag_id");--> statement-breakpoint
CREATE INDEX "images_domain_updated_idx" ON "images" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_domain_name_unique" ON "tags" ("domain_id","name");--> statement-breakpoint
CREATE INDEX "tags_domain_updated_idx" ON "tags" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_domain_slug_unique" ON "videos" ("domain_id","slug");--> statement-breakpoint
CREATE INDEX "videos_domain_order_idx" ON "videos" ("domain_id","order_position","id");--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;