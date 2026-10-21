CREATE TYPE "domain_role" AS ENUM('user', 'member', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "domain_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"domain_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "domain_role" DEFAULT 'user'::"domain_role" NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL UNIQUE,
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "domain_users_domain_user_unique" ON "domain_users" ("domain_id","user_id");--> statement-breakpoint
ALTER TABLE "domain_users" ADD CONSTRAINT "domain_users_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_users" ADD CONSTRAINT "domain_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_created_by_id_users_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");
