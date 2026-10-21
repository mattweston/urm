-- Existing task data is disposable in this environment.
-- Do not apply this migration where task content must be retained.
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DELETE FROM "todo_list_items";
--> statement-breakpoint
ALTER TABLE "todo_list_items"
    ADD COLUMN "domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "todo_list_items" DROP COLUMN "scope_type";
--> statement-breakpoint
ALTER TABLE "todo_list_items" DROP COLUMN "scope_id";
--> statement-breakpoint
CREATE INDEX "todo_list_items_domain_list_order_idx"
    ON "todo_list_items" ("domain_id", "list_id", "order");
