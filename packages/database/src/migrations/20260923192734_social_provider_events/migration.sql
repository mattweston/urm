CREATE TABLE "social_provider_events" (
    "id" text PRIMARY KEY,
    "event_type" text NOT NULL,
    "provider_post_id" text NOT NULL,
    "occurred_at" bigint NOT NULL,
    "received_at" bigint NOT NULL,
    "applied_at" bigint
);
CREATE INDEX "social_provider_events_pending_idx" ON "social_provider_events" ("applied_at", "received_at", "id");
