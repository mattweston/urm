-- Existing members, issues, and issue labels are disposable in this environment.
-- Do not apply this migration where that content must be retained.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DELETE FROM "issues";
--> statement-breakpoint
DELETE FROM "issue_labels";
--> statement-breakpoint
DELETE FROM "members";
--> statement-breakpoint
ALTER TABLE "members"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "issues"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "issue_labels"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "members_domain_updated_idx" ON "members" ("domain_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "issues_domain_updated_idx" ON "issues" ("domain_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "issue_labels_domain_updated_idx" ON "issue_labels" ("domain_id", "updated_at");
