CREATE TYPE "telemetry_level" AS ENUM('debug', 'info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "telemetry_result" AS ENUM('succeeded', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "telemetry_span_status" AS ENUM('started', 'ok', 'error');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY,
	"legacy_id" text,
	"organization_id" text,
	"domain_id" text,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"result" "telemetry_result" NOT NULL,
	"reason_class" text,
	"trace_id" text,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "audit_events_domain_requires_organization" CHECK ("domain_id" IS NULL OR "organization_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "observability_logs" (
	"id" text PRIMARY KEY,
	"legacy_id" text,
	"organization_id" text,
	"domain_id" text,
	"actor_user_id" text,
	"level" "telemetry_level" NOT NULL,
	"message" text NOT NULL,
	"source" text NOT NULL,
	"trace_id" text,
	"span_id" text,
	"session_id" text,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "observability_logs_domain_requires_organization" CHECK ("domain_id" IS NULL OR "organization_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "observability_spans" (
	"id" text PRIMARY KEY,
	"legacy_id" text,
	"organization_id" text,
	"domain_id" text,
	"actor_user_id" text,
	"span_id" text NOT NULL,
	"trace_id" text NOT NULL,
	"parent_span_id" text,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" "telemetry_span_status" NOT NULL,
	"started_at" bigint NOT NULL,
	"ended_at" bigint,
	"attributes" jsonb DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "observability_spans_domain_requires_organization" CHECK ("domain_id" IS NULL OR "organization_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_legacy_unique" ON "audit_events" ("legacy_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" ("created_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_organization_created_idx" ON "audit_events" ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "observability_logs_legacy_unique" ON "observability_logs" ("legacy_id");--> statement-breakpoint
CREATE INDEX "observability_logs_created_idx" ON "observability_logs" ("created_at","id");--> statement-breakpoint
CREATE INDEX "observability_logs_organization_created_idx" ON "observability_logs" ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "observability_logs_level_created_idx" ON "observability_logs" ("level","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "observability_spans_legacy_unique" ON "observability_spans" ("legacy_id");--> statement-breakpoint
CREATE INDEX "observability_spans_created_idx" ON "observability_spans" ("created_at","id");--> statement-breakpoint
CREATE INDEX "observability_spans_organization_created_idx" ON "observability_spans" ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "observability_spans_trace_idx" ON "observability_spans" ("trace_id","started_at");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "observability_logs" ADD CONSTRAINT "observability_logs_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "observability_logs" ADD CONSTRAINT "observability_logs_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "observability_logs" ADD CONSTRAINT "observability_logs_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "observability_spans" ADD CONSTRAINT "observability_spans_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "observability_spans" ADD CONSTRAINT "observability_spans_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "observability_spans" ADD CONSTRAINT "observability_spans_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;