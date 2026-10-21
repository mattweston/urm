CREATE TYPE "domain_hostname_kind" AS ENUM('apex', 'www', 'custom');--> statement-breakpoint
CREATE TYPE "domain_hostname_status" AS ENUM('pending_dns', 'pending_certificate', 'active', 'failed', 'disabled');--> statement-breakpoint
CREATE TABLE "domain_hostnames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"domain_id" uuid NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"apex_hostname" varchar(255) NOT NULL,
	"kind" "domain_hostname_kind" NOT NULL,
	"status" "domain_hostname_status" DEFAULT 'pending_dns'::"domain_hostname_status" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verification_token" varchar(255) NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "domain_hostnames_hostname_unique" ON "domain_hostnames" ("hostname");--> statement-breakpoint
ALTER TABLE "domain_hostnames" ADD CONSTRAINT "domain_hostnames_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;
