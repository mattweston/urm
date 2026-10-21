CREATE TABLE "event_menu_items" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"price" integer NOT NULL,
	"category" text NOT NULL,
	"served_at" jsonb NOT NULL,
	"slug" text NOT NULL,
	"image_url" text NOT NULL,
	"dietary_labels" text NOT NULL,
	"allergens" text NOT NULL,
	"published" boolean NOT NULL,
	"order_position" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"date" bigint NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"venue_name" text NOT NULL,
	"venue_url" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"tickets_url" text NOT NULL,
	"image_url" text NOT NULL,
	"published" boolean NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_menu_items_domain_order_idx" ON "event_menu_items" ("domain_id","order_position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_domain_id_unique" ON "events" ("domain_id","id");--> statement-breakpoint
CREATE INDEX "events_domain_date_idx" ON "events" ("domain_id","date","id");--> statement-breakpoint
ALTER TABLE "event_menu_items" ADD CONSTRAINT "event_menu_items_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "event_menu_items" ADD CONSTRAINT "event_menu_items_domain_id_event_id_events_domain_id_id_fkey" FOREIGN KEY ("domain_id","event_id") REFERENCES "events"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");