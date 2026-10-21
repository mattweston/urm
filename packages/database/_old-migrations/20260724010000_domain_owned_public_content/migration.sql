DELETE FROM "entity_tags";
DELETE FROM "tags";
DELETE FROM "documents";
DELETE FROM "event_menu_items";
DELETE FROM "events";
DELETE FROM "csv_data";
DELETE FROM "csv_uploads";

ALTER TABLE "documents" ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
ALTER TABLE "events" ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
ALTER TABLE "tags" ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
ALTER TABLE "csv_uploads" ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
ALTER TABLE "event_menu_items" ADD COLUMN "event_id" varchar(255) NOT NULL REFERENCES "events"("id") ON DELETE CASCADE;

CREATE INDEX "documents_domain_updated_idx" ON "documents" ("domain_id", "updated_at");
CREATE INDEX "events_domain_updated_idx" ON "events" ("domain_id", "updated_at");
CREATE INDEX "tags_domain_updated_idx" ON "tags" ("domain_id", "updated_at");
CREATE INDEX "csv_uploads_domain_updated_idx" ON "csv_uploads" ("domain_id", "updated_at");
CREATE INDEX "event_menu_items_event_updated_idx" ON "event_menu_items" ("event_id", "updated_at");
