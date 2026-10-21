CREATE TABLE IF NOT EXISTS "observability_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "level" varchar(16) NOT NULL,
    "message" text NOT NULL,
    "source" varchar(255),
    "trace_id" varchar(255),
    "span_id" varchar(255),
    "contact_id" varchar(255) REFERENCES contacts(id),
    "session_id" uuid REFERENCES auth_sessions(id),
    "domain_id" uuid REFERENCES domains(id),
    "request_id" varchar(255),
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "observability_logs_level_created_idx"
    ON "observability_logs" ("level", "created_at");

CREATE INDEX IF NOT EXISTS "observability_logs_source_created_idx"
    ON "observability_logs" ("source", "created_at");

CREATE INDEX IF NOT EXISTS "observability_logs_contact_created_idx"
    ON "observability_logs" ("contact_id", "created_at");

CREATE INDEX IF NOT EXISTS "observability_logs_session_created_idx"
    ON "observability_logs" ("session_id", "created_at");

CREATE INDEX IF NOT EXISTS "observability_logs_trace_created_idx"
    ON "observability_logs" ("trace_id", "created_at");
