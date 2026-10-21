CREATE TABLE "audit_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "action" varchar(255) NOT NULL,
    "entity_type" varchar(255) NOT NULL,
    "entity_id" varchar(255),
    "actor_contact_id" varchar(255),
    "contact_id" varchar(255),
    "domain_id" uuid,
    "org_id" uuid,
    "session_id" uuid,
    "request_id" varchar(255),
    "trace_id" varchar(255),
    "result" varchar(64) NOT NULL DEFAULT 'succeeded',
    "reason_class" varchar(255),
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "audit_events_action_created_idx" ON "audit_events" ("action", "created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" ("actor_contact_id", "created_at");--> statement-breakpoint
CREATE INDEX "audit_events_contact_created_idx" ON "audit_events" ("contact_id", "created_at");--> statement-breakpoint
CREATE INDEX "audit_events_domain_created_idx" ON "audit_events" ("domain_id", "created_at");--> statement-breakpoint
CREATE INDEX "audit_events_session_created_idx" ON "audit_events" ("session_id", "created_at");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_contact_id_contacts_id_fkey" FOREIGN KEY ("actor_contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_domain_id_domains_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_org_id_orgs_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_session_id_auth_sessions_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id");
