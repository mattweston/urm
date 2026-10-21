CREATE TABLE "auth_rate_limit_buckets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" varchar(512) NOT NULL,
    "route" varchar(255) NOT NULL,
    "window_start" bigint NOT NULL,
    "window_seconds" integer NOT NULL,
    "count" integer NOT NULL,
    "blocked_until" bigint,
    "updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_rate_limit_buckets_key_window_unique" ON "auth_rate_limit_buckets" ("key", "route", "window_start");
