SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE UNIQUE INDEX "carts_domain_session_unique" ON "carts" ("domain_id", "session_id");
