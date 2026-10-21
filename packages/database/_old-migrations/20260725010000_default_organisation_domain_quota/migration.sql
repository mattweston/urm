-- Existing organisation quotas are intentional operator policy and remain unchanged.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "orgs" ALTER COLUMN "max_domains" SET DEFAULT 3;
