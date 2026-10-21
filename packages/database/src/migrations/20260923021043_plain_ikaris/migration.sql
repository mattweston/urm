CREATE TABLE "csv_data" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"upload_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"data" text NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "csv_data_index_check" CHECK ("row_index" BETWEEN 0 AND 999),
	CONSTRAINT "csv_data_length_check" CHECK (length("data") <= 100000)
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"filename" text NOT NULL,
	"uploader_id" text NOT NULL,
	"uploader_name" text NOT NULL,
	"imports" jsonb DEFAULT '[]' NOT NULL,
	"row_count" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "csv_uploads_row_count_check" CHECK ("row_count" BETWEEN 1 AND 1000),
	CONSTRAINT "csv_uploads_status_check" CHECK ("status" IN ('processing','completed','failed')),
	CONSTRAINT "csv_uploads_filename_check" CHECK (length("filename") BETWEEN 1 AND 500)
);
--> statement-breakpoint
CREATE TABLE "data_table_rows" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"table_id" text NOT NULL,
	"values" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "data_table_rows_revision_check" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "data_tables" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"columns" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "data_tables_name_check" CHECK (length("name") BETWEEN 1 AND 100),
	CONSTRAINT "data_tables_revision_check" CHECK ("revision" >= 1),
	CONSTRAINT "data_tables_row_count_check" CHECK ("row_count" BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "csv_data_upload_row_unique" ON "csv_data" ("upload_id","row_index");--> statement-breakpoint
CREATE INDEX "csv_data_domain_upload_idx" ON "csv_data" ("domain_id","upload_id","row_index");--> statement-breakpoint
CREATE UNIQUE INDEX "csv_uploads_domain_id_unique" ON "csv_uploads" ("domain_id","id");--> statement-breakpoint
CREATE INDEX "csv_uploads_domain_updated_idx" ON "csv_uploads" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "data_table_rows_domain_table_idx" ON "data_table_rows" ("domain_id","table_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_tables_domain_id_unique" ON "data_tables" ("domain_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_tables_domain_name_unique" ON "data_tables" ("domain_id",lower("name"));--> statement-breakpoint
CREATE INDEX "data_tables_domain_updated_idx" ON "data_tables" ("domain_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "csv_data" ADD CONSTRAINT "csv_data_domain_id_upload_id_csv_uploads_domain_id_id_fkey" FOREIGN KEY ("domain_id","upload_id") REFERENCES "csv_uploads"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "data_table_rows" ADD CONSTRAINT "data_table_rows_d48vjqdylDtz_fkey" FOREIGN KEY ("domain_id","table_id") REFERENCES "data_tables"("domain_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;