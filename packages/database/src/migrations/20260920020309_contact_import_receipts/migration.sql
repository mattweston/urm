CREATE TABLE "contact_import_receipts" (
	"domain_id" text,
	"source_id" text,
	"payload_hash" text NOT NULL,
	"imported" integer NOT NULL,
	"account_id" text NOT NULL,
	"completed_at" bigint NOT NULL,
	CONSTRAINT "contact_import_receipts_pkey" PRIMARY KEY("domain_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "contact_import_receipts" ADD CONSTRAINT "contact_import_receipts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_import_receipts" ADD CONSTRAINT "contact_import_receipts_account_id_auth_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth_accounts"("id");