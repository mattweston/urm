CREATE TYPE "auth_session_provider_status" AS ENUM('active', 'expired', 'revoked', 'unknown');--> statement-breakpoint
CREATE TYPE "domain_contact_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "module_id" AS ENUM('Documents', 'Blog', 'Projects', 'Shop', 'Finance', 'Issues', 'Events', 'Tags', 'Mail', 'Media', 'Data', 'Learn');--> statement-breakpoint
CREATE TYPE "organization_kind" AS ENUM('personal', 'customer');--> statement-breakpoint
CREATE TYPE "organization_member_role" AS ENUM('owner', 'admin', 'sysadmin', 'member');--> statement-breakpoint
CREATE TYPE "organization_member_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "publication_access" AS ENUM('public', 'link', 'password');--> statement-breakpoint
CREATE TYPE "publication_status" AS ENUM('draft', 'live', 'disabled');--> statement-breakpoint
CREATE TYPE "user_auth_provider" AS ENUM('workos');--> statement-breakpoint
CREATE TYPE "user_platform_role" AS ENUM('platform_sysadmin');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY,
	"provider_session_id" varchar(1024) NOT NULL,
	"user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen_at" bigint NOT NULL,
	"expires_at" bigint,
	"revoked_at" bigint,
	"verified_at" bigint,
	"provider_status" "auth_session_provider_status"
);
--> statement-breakpoint
CREATE TABLE "contact_email_addresses" (
	"id" text PRIMARY KEY,
	"contact_id" text NOT NULL,
	"email" text NOT NULL,
	"is_primary" boolean NOT NULL,
	"verified_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "contact_email_addresses_email_normalized" CHECK ("email" = lower(btrim("email")))
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"tel" varchar(50),
	"title" varchar(255),
	"company" varchar(255),
	"image" varchar(2048),
	"is_test_contact" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "domain_contacts" (
	"id" text PRIMARY KEY,
	"domain_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" "domain_contact_status" NOT NULL,
	"source" varchar(64),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" bigint,
	"updated_at" bigint NOT NULL,
	"enabled_modules" "module_id"[],
	"module_settings_version" integer,
	"publication_status" "publication_status" NOT NULL,
	"publication_access" "publication_access" NOT NULL,
	"development_release_id" text,
	"development_deployment_id" text,
	"staging_release_id" text,
	"staging_deployment_id" text,
	"production_release_id" text,
	"production_deployment_id" text,
	CONSTRAINT "domains_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"consumed_at" bigint,
	"revoked_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "organization_invitations_token_hash_format" CHECK ("token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"status" "organization_member_status" NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"kind" "organization_kind" NOT NULL,
	"max_domains" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	CONSTRAINT "organizations_max_domains_positive" CHECK ("max_domains" >= 1),
	CONSTRAINT "organizations_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"platform_role" "user_platform_role",
	"token_identifier" varchar(1024),
	"auth_provider" "user_auth_provider",
	"provider_subject" varchar(1024),
	"personal_organization_id" text,
	"name" varchar(255),
	"email" text,
	"email_verified" boolean,
	"image_url" varchar(2048),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"last_seen_at" bigint,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_provider_session_unique" ON "auth_sessions" ("provider_session_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_last_seen_idx" ON "auth_sessions" ("last_seen_at","id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_last_seen_idx" ON "auth_sessions" ("user_id","last_seen_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_email_addresses_email_unique" ON "contact_email_addresses" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_email_addresses_primary_unique" ON "contact_email_addresses" ("contact_id") WHERE "is_primary";--> statement-breakpoint
CREATE INDEX "contact_email_addresses_contact_updated_idx" ON "contact_email_addresses" ("contact_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "contacts_updated_at_idx" ON "contacts" ("updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_contacts_domain_contact_unique" ON "domain_contacts" ("domain_id","contact_id");--> statement-breakpoint
CREATE INDEX "domain_contacts_domain_updated_idx" ON "domain_contacts" ("domain_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "domain_contacts_contact_updated_idx" ON "domain_contacts" ("contact_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_slug_unique" ON "domains" ("slug");--> statement-breakpoint
CREATE INDEX "domains_organization_updated_idx" ON "domains" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "domains_created_by_user_idx" ON "domains" ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "domains_updated_at_idx" ON "domains" ("updated_at","id");--> statement-breakpoint
CREATE INDEX "organization_invitations_organization_email_idx" ON "organization_invitations" ("organization_id","email");--> statement-breakpoint
CREATE INDEX "organization_invitations_organization_created_idx" ON "organization_invitations" ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "organization_invitations_invited_by_idx" ON "organization_invitations" ("invited_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_token_hash_unique" ON "organization_invitations" ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_organization_user_unique" ON "organization_members" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_updated_idx" ON "organization_members" ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_status_idx" ON "organization_members" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_members_user_status_idx" ON "organization_members" ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX "organizations_updated_at_idx" ON "organizations" ("updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_token_identifier_unique" ON "users" ("token_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_provider_subject_unique" ON "users" ("auth_provider","provider_subject");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX "users_personal_organization_idx" ON "users" ("personal_organization_id");--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_email_addresses" ADD CONSTRAINT "contact_email_addresses_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_contacts" ADD CONSTRAINT "domain_contacts_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domain_contacts" ADD CONSTRAINT "domain_contacts_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_user_id_users_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_personal_organization_id_organizations_id_fkey" FOREIGN KEY ("personal_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;