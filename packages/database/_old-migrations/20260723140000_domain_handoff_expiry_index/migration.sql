SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DROP INDEX "auth_domain_handoffs_domain_created_idx";
--> statement-breakpoint
CREATE INDEX "auth_domain_handoffs_expires_at_idx" ON "auth_domain_handoffs" ("expires_at");
