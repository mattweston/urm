CREATE TABLE IF NOT EXISTS "observability_spans" (
    "span_id" varchar(32) PRIMARY KEY,
    "trace_id" varchar(32) NOT NULL,
    "parent_span_id" varchar(32),
    "name" varchar(512) NOT NULL,
    "kind" varchar(16) NOT NULL,
    "status" varchar(16) NOT NULL,
    "started_at" timestamp NOT NULL,
    "ended_at" timestamp,
    "duration_ms" double precision,
    "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "events" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "observability_spans_trace_started_idx"
    ON "observability_spans" ("trace_id", "started_at");

CREATE INDEX IF NOT EXISTS "observability_spans_name_started_idx"
    ON "observability_spans" ("name", "started_at");

CREATE INDEX IF NOT EXISTS "observability_spans_status_started_idx"
    ON "observability_spans" ("status", "started_at");

CREATE INDEX IF NOT EXISTS "observability_spans_started_idx"
    ON "observability_spans" ("started_at");
