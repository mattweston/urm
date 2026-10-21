ALTER TABLE "data_table_rows" ADD COLUMN "position" integer;--> statement-breakpoint
WITH numbered AS (
    SELECT id, row_number() OVER (PARTITION BY table_id ORDER BY created_at,id) - 1 AS next_position
    FROM data_table_rows
)
UPDATE data_table_rows AS row SET position=numbered.next_position
FROM numbered WHERE row.id=numbered.id;--> statement-breakpoint
ALTER TABLE "data_table_rows" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
DROP INDEX "data_table_rows_domain_table_idx";--> statement-breakpoint
CREATE INDEX "data_table_rows_domain_table_idx" ON "data_table_rows" ("domain_id","table_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_table_rows_table_position_unique" ON "data_table_rows" ("table_id","position");--> statement-breakpoint
ALTER TABLE "data_table_rows" ADD CONSTRAINT "data_table_rows_position_check" CHECK ("position" >= 0);
