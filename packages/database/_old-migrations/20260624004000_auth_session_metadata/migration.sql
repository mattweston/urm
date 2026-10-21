ALTER TABLE "auth_sessions" ADD COLUMN "last_seen_at" bigint;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "rotated_at" bigint;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "revoked_reason" varchar(255);
--> statement-breakpoint
CREATE INDEX "auth_sessions_contact_active_idx" ON "auth_sessions" ("contact_id", "revoked_at");
