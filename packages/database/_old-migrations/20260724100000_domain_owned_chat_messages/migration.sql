-- Existing persisted chat messages are disposable in this environment.
-- Do not apply this migration where chat history must be retained.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DELETE FROM "messages";
--> statement-breakpoint
ALTER TABLE "messages"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "messages_domain_contact_updated_idx"
    ON "messages" ("domain_id", "contact_id", "updated_at");
