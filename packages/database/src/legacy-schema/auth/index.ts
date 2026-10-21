import {
    bigint,
    doublePrecision,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { contacts } from "../contacts/index.ts"
import { domains } from "../domains/index.ts"
import { orgs } from "../organisations/index.ts"

export const auth_accounts = pgTable(
    "auth_accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        provider: varchar("provider", { length: 64 }).notNull(),
        provider_account_id: varchar("provider_account_id", {
            length: 255,
        }).notNull(),
        email: varchar("email", { length: 255 }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        unique_provider_account: uniqueIndex(
            "auth_accounts_provider_account_unique"
        ).on(table.provider, table.provider_account_id),
    })
)

export const auth_sessions = pgTable(
    "auth_sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        revoked_at: bigint("revoked_at", { mode: "number" }),
        last_seen_at: bigint("last_seen_at", { mode: "number" }),
        rotated_at: bigint("rotated_at", { mode: "number" }),
        last_authenticated_at: bigint("last_authenticated_at", {
            mode: "number",
        }),
        revoked_reason: varchar("revoked_reason", { length: 255 }),
        domain_id: uuid("domain_id").references(() => domains.id, {
            onDelete: "cascade",
        }),
        hostname: varchar("hostname", { length: 255 }),
        cookie_domain: varchar("cookie_domain", { length: 255 }),
        ip_address: varchar("ip_address", { length: 255 }),
        user_agent: varchar("user_agent", { length: 2048 }),
    },
    (table) => ({
        unique_token_hash: uniqueIndex("auth_sessions_token_hash_unique").on(
            table.token_hash
        ),
        contact_active: index("auth_sessions_contact_active_idx").on(
            table.contact_id,
            table.revoked_at
        ),
    })
)

export const audit_events = pgTable(
    "audit_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        action: varchar("action", { length: 255 }).notNull(),
        entity_type: varchar("entity_type", { length: 255 }).notNull(),
        entity_id: varchar("entity_id", { length: 255 }),
        actor_contact_id: varchar("actor_contact_id", {
            length: 255,
        }).references(() => contacts.id),
        contact_id: varchar("contact_id", { length: 255 }).references(
            () => contacts.id
        ),
        domain_id: uuid("domain_id").references(() => domains.id),
        org_id: uuid("org_id").references(() => orgs.id),
        session_id: uuid("session_id").references(() => auth_sessions.id),
        request_id: varchar("request_id", { length: 255 }),
        trace_id: varchar("trace_id", { length: 255 }),
        result: varchar("result", { length: 64 })
            .notNull()
            .default("succeeded"),
        reason_class: varchar("reason_class", { length: 255 }),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        action_created: index("audit_events_action_created_idx").on(
            table.action,
            table.created_at
        ),
        actor_created: index("audit_events_actor_created_idx").on(
            table.actor_contact_id,
            table.created_at
        ),
        contact_created: index("audit_events_contact_created_idx").on(
            table.contact_id,
            table.created_at
        ),
        domain_created: index("audit_events_domain_created_idx").on(
            table.domain_id,
            table.created_at
        ),
        session_created: index("audit_events_session_created_idx").on(
            table.session_id,
            table.created_at
        ),
    })
)

export const observability_logs = pgTable(
    "observability_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        level: varchar("level", { length: 16 }).notNull(),
        message: text("message").notNull(),
        source: varchar("source", { length: 255 }),
        trace_id: varchar("trace_id", { length: 255 }),
        span_id: varchar("span_id", { length: 255 }),
        contact_id: varchar("contact_id", { length: 255 }).references(
            () => contacts.id
        ),
        session_id: uuid("session_id").references(() => auth_sessions.id),
        domain_id: uuid("domain_id").references(() => domains.id),
        request_id: varchar("request_id", { length: 255 }),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        level_created: index("observability_logs_level_created_idx").on(
            table.level,
            table.created_at
        ),
        source_created: index("observability_logs_source_created_idx").on(
            table.source,
            table.created_at
        ),
        contact_created: index("observability_logs_contact_created_idx").on(
            table.contact_id,
            table.created_at
        ),
        session_created: index("observability_logs_session_created_idx").on(
            table.session_id,
            table.created_at
        ),
        trace_created: index("observability_logs_trace_created_idx").on(
            table.trace_id,
            table.created_at
        ),
    })
)

export type ObservabilitySpanEvent = {
    name: string
    at: number
    attributes: Record<string, unknown>
}

export const observability_spans = pgTable(
    "observability_spans",
    {
        span_id: varchar("span_id", { length: 32 }).primaryKey(),
        trace_id: varchar("trace_id", { length: 32 }).notNull(),
        parent_span_id: varchar("parent_span_id", { length: 32 }),
        name: varchar("name", { length: 512 }).notNull(),
        kind: varchar("kind", { length: 16 }).notNull(),
        status: varchar("status", { length: 16 }).notNull(),
        started_at: timestamp("started_at").notNull(),
        ended_at: timestamp("ended_at"),
        duration_ms: doublePrecision("duration_ms"),
        attributes: jsonb("attributes")
            .$type<Record<string, unknown>>()
            .notNull()
            .default(sql`'{}'::jsonb`),
        events: jsonb("events")
            .$type<Array<ObservabilitySpanEvent>>()
            .notNull()
            .default(sql`'[]'::jsonb`),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        trace_started: index("observability_spans_trace_started_idx").on(
            table.trace_id,
            table.started_at
        ),
        name_started: index("observability_spans_name_started_idx").on(
            table.name,
            table.started_at
        ),
        status_started: index("observability_spans_status_started_idx").on(
            table.status,
            table.started_at
        ),
        started: index("observability_spans_started_idx").on(table.started_at),
    })
)

export const auth_rate_limit_buckets = pgTable(
    "auth_rate_limit_buckets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        key: varchar("key", { length: 512 }).notNull(),
        route: varchar("route", { length: 255 }).notNull(),
        window_start: bigint("window_start", { mode: "number" }).notNull(),
        window_seconds: integer("window_seconds").notNull(),
        count: integer("count").notNull(),
        blocked_until: bigint("blocked_until", { mode: "number" }),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        key_window_unique: uniqueIndex(
            "auth_rate_limit_buckets_key_window_unique"
        ).on(table.key, table.route, table.window_start),
    })
)

export const auth_password_credentials = pgTable(
    "auth_password_credentials",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        password_hash: varchar("password_hash", { length: 512 }).notNull(),
        algorithm: varchar("algorithm", { length: 64 }).notNull(),
        parameters: jsonb("parameters").notNull().default(sql`'{}'::jsonb`),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        disabled_at: bigint("disabled_at", { mode: "number" }),
    },
    (table) => ({
        contact_unique: uniqueIndex("auth_password_credentials_contact_unique")
            .on(table.contact_id)
            .where(sql`${table.disabled_at} is null`),
    })
)

export const auth_email_verification_tokens = pgTable(
    "auth_email_verification_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        email: varchar("email", { length: 255 }).notNull(),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        purpose: varchar("purpose", { length: 64 })
            .notNull()
            .default("verify_email"),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        request_ip_hash: varchar("request_ip_hash", { length: 255 }),
        user_agent_hash: varchar("user_agent_hash", { length: 255 }),
    },
    (table) => ({
        hash_unique: uniqueIndex(
            "auth_email_verification_tokens_hash_unique"
        ).on(table.token_hash),
        contact_created: index(
            "auth_email_verification_tokens_contact_created_idx"
        ).on(table.contact_id, table.created_at),
    })
)

export const auth_password_reset_tokens = pgTable(
    "auth_password_reset_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        email: varchar("email", { length: 255 }).notNull(),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        request_ip_hash: varchar("request_ip_hash", { length: 255 }),
        user_agent_hash: varchar("user_agent_hash", { length: 255 }),
    },
    (table) => ({
        hash_unique: uniqueIndex("auth_password_reset_tokens_hash_unique").on(
            table.token_hash
        ),
        contact_created: index(
            "auth_password_reset_tokens_contact_created_idx"
        ).on(table.contact_id, table.created_at),
    })
)

export const auth_oauth_states = pgTable(
    "auth_oauth_states",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        provider: varchar("provider", { length: 64 }).notNull(),
        state_hash: varchar("state_hash", { length: 64 }).notNull(),
        code_verifier_hash: varchar("code_verifier_hash", {
            length: 64,
        }).notNull(),
        redirect_to: varchar("redirect_to", { length: 2048 }),
        host: varchar("host", { length: 255 }),
        domain_id: uuid("domain_id").references(() => domains.id),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        request_ip_hash: varchar("request_ip_hash", { length: 255 }),
        user_agent_hash: varchar("user_agent_hash", { length: 255 }),
    },
    (table) => ({
        state_hash_unique: uniqueIndex(
            "auth_oauth_states_state_hash_unique"
        ).on(table.state_hash),
        provider_created: index("auth_oauth_states_provider_created_idx").on(
            table.provider,
            table.created_at
        ),
    })
)

/** A single-use central-to-domain browser-session handoff. */
export const auth_domain_handoffs = pgTable(
    "auth_domain_handoffs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        code_hash: varchar("code_hash", { length: 64 }).notNull(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        hostname: varchar("hostname", { length: 255 }).notNull(),
        target_route: varchar("target_route", { length: 2048 }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        code_hash_unique: uniqueIndex(
            "auth_domain_handoffs_code_hash_unique"
        ).on(table.code_hash),
        expires_at: index("auth_domain_handoffs_expires_at_idx").on(
            table.expires_at
        ),
    })
)

export type AuthAccount = typeof auth_accounts.$inferSelect
export type NewAuthAccount = typeof auth_accounts.$inferInsert
export type AuthSession = typeof auth_sessions.$inferSelect
export type NewAuthSession = typeof auth_sessions.$inferInsert
export type AuditEvent = typeof audit_events.$inferSelect
export type NewAuditEvent = typeof audit_events.$inferInsert
export type ObservabilityLog = typeof observability_logs.$inferSelect
export type NewObservabilityLog = typeof observability_logs.$inferInsert
export type ObservabilitySpan = typeof observability_spans.$inferSelect
export type NewObservabilitySpan = typeof observability_spans.$inferInsert
export type AuthRateLimitBucket = typeof auth_rate_limit_buckets.$inferSelect
export type NewAuthRateLimitBucket = typeof auth_rate_limit_buckets.$inferInsert
export type AuthPasswordCredential =
    typeof auth_password_credentials.$inferSelect
export type NewAuthPasswordCredential =
    typeof auth_password_credentials.$inferInsert
export type AuthEmailVerificationToken =
    typeof auth_email_verification_tokens.$inferSelect
export type NewAuthEmailVerificationToken =
    typeof auth_email_verification_tokens.$inferInsert
export type AuthPasswordResetToken =
    typeof auth_password_reset_tokens.$inferSelect
export type NewAuthPasswordResetToken =
    typeof auth_password_reset_tokens.$inferInsert
export type AuthOauthState = typeof auth_oauth_states.$inferSelect
export type NewAuthOauthState = typeof auth_oauth_states.$inferInsert
export type AuthDomainHandoff = typeof auth_domain_handoffs.$inferSelect
export type NewAuthDomainHandoff = typeof auth_domain_handoffs.$inferInsert
