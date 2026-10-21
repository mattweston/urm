import { sql } from "drizzle-orm"
import { bigint, boolean, check, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { contacts } from "./contacts.ts"
import { domains } from "./domains.ts"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const email_provider = pgEnum("email_provider", ["cloudflare", "bento"])
export const email_delivery_status = pgEnum("email_delivery_status", ["pending", "accepted", "queued", "sent", "delivered", "bounced", "complained", "failed", "skipped"])
export const email_send_status = pgEnum("email_send_status", ["draft", "queued", "sending", "completed", "failed"])
export const email_subscription_status = pgEnum("email_subscription_status", ["subscribed", "unsubscribed", "suppressed"])
export const email_stream_status = pgEnum("email_stream_status", ["pending", "verifying", "verified", "failed", "disabled"])

export const domain_email_streams = pgTable("domain_email_streams", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    provider: email_provider().notNull(),
    sending_label: text().notNull(),
    status: email_stream_status().notNull(),
    provider_reference: text(),
    verified_at: bigint({ mode: "number" }),
    created_at: bigint({ mode: "number" }).notNull(),
    updated_at: bigint({ mode: "number" }).notNull(),
}, (t) => [
    uniqueIndex("domain_email_streams_domain_kind_unique").on(t.domain_id, t.kind),
    index("domain_email_streams_status_updated_idx").on(t.status, t.updated_at),
    check("domain_email_streams_kind_check", sql`${t.kind} in ('transactional', 'bulk')`),
    check("domain_email_streams_label_check", sql`${t.sending_label} in ('mail', 'newsletter')`),
])

export const email_newsletter_drafts = pgTable("email_newsletter_drafts", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    name: text().notNull(), subject: text().notNull(), headline: text().notNull(), body_text: text().notNull(),
    cta_url: text(), cta_label: text(), list_key: text().notNull(), template_source: jsonb(),
    updated_at: bigint({ mode: "number" }).notNull(),
}, (t) => [
    uniqueIndex("email_newsletter_drafts_id_domain_unique").on(t.id, t.domain_id),
    index("email_newsletter_drafts_domain_updated_idx").on(t.domain_id, t.updated_at, t.id),
])

export const email_newsletter_sends = pgTable("email_newsletter_sends", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    draft_id: text(), name: text().notNull(), template_id: text().notNull(), publication_theme: jsonb(),
    subject: text().notNull(), list_key: text().notNull(), provider: email_provider().notNull(), audience: text(), idempotency_key: text(),
    headline: text(), body_text: text(), cta_url: text(), cta_label: text(),
    authoring_template_source: jsonb(), delivery_template_source: jsonb(),
    status: email_send_status().notNull(),
    approved_contact_count: integer().notNull(), accepted_count: integer().notNull(), queued_count: integer().notNull(),
    sent_count: integer().notNull(), failed_count: integer().notNull(), skipped_count: integer().notNull(), error_message: text(),
    created_at: bigint({ mode: "number" }).notNull(), updated_at: bigint({ mode: "number" }).notNull(),
    started_at: bigint({ mode: "number" }), completed_at: bigint({ mode: "number" }),
}, (t) => [
    uniqueIndex("email_newsletter_sends_id_domain_unique").on(t.id, t.domain_id),
    uniqueIndex("email_newsletter_sends_domain_request_unique").on(t.domain_id, t.idempotency_key),
    index("email_newsletter_sends_domain_created_idx").on(t.domain_id, t.created_at, t.id),
    index("email_newsletter_sends_domain_status_created_idx").on(t.domain_id, t.status, t.created_at, t.id),
    foreignKey({ columns: [t.draft_id, t.domain_id], foreignColumns: [email_newsletter_drafts.id, email_newsletter_drafts.domain_id] }),
    check("email_newsletter_sends_audience_check", sql`${t.audience} in ('test', 'subscribers')`),
])

export const email_subscriptions = pgTable("email_subscriptions", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    contact_id: text().notNull().references(() => contacts.id, { onDelete: "cascade" }),
    list_key: text().notNull(), status: email_subscription_status().notNull(), source: text(),
    created_at: bigint({ mode: "number" }).notNull(), updated_at: bigint({ mode: "number" }).notNull(),
    subscribed_at: bigint({ mode: "number" }), unsubscribed_at: bigint({ mode: "number" }),
}, (t) => [
    uniqueIndex("email_subscriptions_domain_contact_list_unique").on(t.domain_id, t.contact_id, t.list_key),
    uniqueIndex("email_subscriptions_identity_unique").on(t.id, t.domain_id, t.contact_id, t.list_key),
    index("email_subscriptions_domain_list_updated_idx").on(t.domain_id, t.list_key, t.updated_at, t.id),
    index("email_subscriptions_domain_list_status_updated_idx").on(t.domain_id, t.list_key, t.status, t.updated_at, t.id),
])

export const email_deliveries = pgTable("email_deliveries", {
    id: text().primaryKey(), domain_id: text().references(() => domains.id, { onDelete: "cascade" }),
    contact_id: text().references(() => contacts.id, { onDelete: "set null" }), newsletter_send_id: text(),
    template_id: text().notNull(), transactional_template_version: integer(), is_test: boolean(),
    purpose: text().notNull(), provider: email_provider().notNull(), provider_message_id: text(), provider_status: text(),
    status: email_delivery_status().notNull(), to_hash: text().notNull(), to_domain: text(), subject: text().notNull(),
    provider_event_at: bigint({ mode: "number" }),
    error_class: text(), error_message: text(), idempotency_key: text().notNull(),
    created_at: bigint({ mode: "number" }).notNull(), updated_at: bigint({ mode: "number" }).notNull(),
    accepted_at: bigint({ mode: "number" }), queued_at: bigint({ mode: "number" }), sent_at: bigint({ mode: "number" }),
    delivered_at: bigint({ mode: "number" }), failed_at: bigint({ mode: "number" }), skipped_at: bigint({ mode: "number" }),
}, (t) => [
    uniqueIndex("email_deliveries_idempotency_unique").on(t.idempotency_key),
    index("email_deliveries_domain_created_idx").on(t.domain_id, t.created_at, t.id),
    index("email_deliveries_contact_created_idx").on(t.contact_id, t.created_at, t.id),
    index("email_deliveries_send_created_idx").on(t.newsletter_send_id, t.created_at, t.id),
    index("email_deliveries_provider_message_idx").on(t.provider, t.provider_message_id),
    index("email_deliveries_status_created_idx").on(t.status, t.created_at, t.id),
    foreignKey({ columns: [t.newsletter_send_id, t.domain_id], foreignColumns: [email_newsletter_sends.id, email_newsletter_sends.domain_id] }),
    check("email_deliveries_send_domain_check", sql`${t.newsletter_send_id} is null or ${t.domain_id} is not null`),
    check("email_deliveries_purpose_check", sql`${t.purpose} in ('newsletter', 'transactional')`),
    check("email_deliveries_hash_check", sql`${t.to_hash} ~ '^[a-f0-9]{64}$'`),
])

export const email_provider_events = pgTable("email_provider_events", {
    id: text().primaryKey(),
    provider: email_provider().notNull(),
    provider_message_id: text().notNull(),
    recipient_hash: text().notNull(),
    event_type: text().notNull(),
    bounce_type: text(),
    occurred_at: bigint({ mode: "number" }).notNull(),
    delivery_id: text().references(() => email_deliveries.id, { onDelete: "set null" }),
    applied_at: bigint({ mode: "number" }),
    created_at: bigint({ mode: "number" }).notNull(),
}, (t) => [
    index("email_provider_events_message_pending_idx").on(t.provider, t.provider_message_id, t.applied_at),
    index("email_provider_events_delivery_occurred_idx").on(t.delivery_id, t.occurred_at),
    check("email_provider_events_recipient_hash_check", sql`${t.recipient_hash} ~ '^[a-f0-9]{64}$'`),
])

export const email_unsubscribe_tokens = pgTable("email_unsubscribe_tokens", {
    id: text().primaryKey(), domain_id: text().notNull(), contact_id: text().notNull(), subscription_id: text().notNull(),
    list_key: text().notNull(), token_hash: text().notNull(), created_at: bigint({ mode: "number" }).notNull(), used_at: bigint({ mode: "number" }),
}, (t) => [
    uniqueIndex("email_unsubscribe_tokens_hash_unique").on(t.token_hash),
    index("email_unsubscribe_tokens_domain_created_idx").on(t.domain_id, t.created_at, t.id),
    foreignKey({ columns: [t.subscription_id, t.domain_id, t.contact_id, t.list_key], foreignColumns: [email_subscriptions.id, email_subscriptions.domain_id, email_subscriptions.contact_id, email_subscriptions.list_key] }).onDelete("cascade"),
    check("email_unsubscribe_tokens_hash_check", sql`${t.token_hash} ~ '^[a-f0-9]{64}$'`),
])

export const email_newsletter_templates = pgTable("email_newsletter_templates", {
    id: text().primaryKey(),
    organization_id: text().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(), description: text().notNull(), tags: text().array().notNull(),
    subject: text().notNull(), headline: text().notNull(), body_text: text().notNull(),
    cta_url: text(), cta_label: text(),
    revision: integer().notNull(),
    created_by_user_id: text().notNull().references(() => users.id),
    updated_by_user_id: text().notNull().references(() => users.id),
    created_at: bigint({ mode: "number" }).notNull(),
    updated_at: bigint({ mode: "number" }).notNull(),
}, (t) => [index("email_newsletter_templates_org_updated_idx").on(t.organization_id, t.updated_at, t.id)])

export const email_transactional_versions = pgTable("email_transactional_versions", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    template_id: text().notNull(),
    version: integer().notNull(),
    copy: jsonb().notNull(),
    restored_from_version: integer(),
    created_at: bigint({ mode: "number" }).notNull(),
    created_by: text().notNull().references(() => users.id),
}, (t) => [
    uniqueIndex("email_transactional_versions_unique").on(t.domain_id, t.template_id, t.version),
    index("email_transactional_versions_lookup_idx").on(t.domain_id, t.template_id, t.version),
])

export const email_transactional_active = pgTable("email_transactional_active", {
    id: text().primaryKey(),
    domain_id: text().notNull().references(() => domains.id, { onDelete: "cascade" }),
    template_id: text().notNull(),
    active_version: integer().notNull(),
    updated_at: bigint({ mode: "number" }).notNull(),
    updated_by: text().notNull().references(() => users.id),
}, (t) => [
    uniqueIndex("email_transactional_active_unique").on(t.domain_id, t.template_id),
])
