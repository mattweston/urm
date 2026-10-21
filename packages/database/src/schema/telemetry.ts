import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    foreignKey,
    index,
    jsonb,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const telemetry_result = pgEnum("telemetry_result", [
    "succeeded",
    "failed",
    "blocked",
])
export const telemetry_level = pgEnum("telemetry_level", [
    "debug",
    "info",
    "warning",
    "error",
])
export const telemetry_span_status = pgEnum("telemetry_span_status", [
    "started",
    "ok",
    "error",
])

export const audit_events = pgTable(
    "audit_events",
    {
        id: text("id").primaryKey(),
        legacy_id: text("legacy_id"),
        organization_id: text("organization_id").references(
            () => organizations.id,
            { onDelete: "restrict" }
        ),
        domain_id: text("domain_id").references(() => domains.id, {
            onDelete: "restrict",
        }),
        actor_user_id: text("actor_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        action: text("action").notNull(),
        entity_type: text("entity_type").notNull(),
        entity_id: text("entity_id"),
        result: telemetry_result("result").notNull(),
        reason_class: text("reason_class"),
        trace_id: text("trace_id"),
        request_id: text("request_id"),
        metadata: jsonb("metadata").notNull().default({}),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.organization_id],
            foreignColumns: [domains.id, domains.organization_id],
        }).onDelete("restrict"),
        uniqueIndex("audit_events_legacy_unique").on(t.legacy_id),
        index("audit_events_created_idx").on(t.created_at, t.id),
        index("audit_events_organization_created_idx").on(
            t.organization_id,
            t.created_at,
            t.id
        ),
        check(
            "audit_events_domain_requires_organization",
            sql`${t.domain_id} IS NULL OR ${t.organization_id} IS NOT NULL`
        ),
    ]
)

export const observability_logs = pgTable(
    "observability_logs",
    {
        id: text("id").primaryKey(),
        legacy_id: text("legacy_id"),
        organization_id: text("organization_id").references(
            () => organizations.id,
            { onDelete: "restrict" }
        ),
        domain_id: text("domain_id").references(() => domains.id, {
            onDelete: "restrict",
        }),
        actor_user_id: text("actor_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        level: telemetry_level("level").notNull(),
        message: text("message").notNull(),
        source: text("source").notNull(),
        trace_id: text("trace_id"),
        span_id: text("span_id"),
        session_id: text("session_id"),
        request_id: text("request_id"),
        metadata: jsonb("metadata").notNull().default({}),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.organization_id],
            foreignColumns: [domains.id, domains.organization_id],
        }).onDelete("restrict"),
        uniqueIndex("observability_logs_legacy_unique").on(t.legacy_id),
        index("observability_logs_created_idx").on(t.created_at, t.id),
        index("observability_logs_organization_created_idx").on(
            t.organization_id,
            t.created_at,
            t.id
        ),
        index("observability_logs_level_created_idx").on(
            t.level,
            t.created_at,
            t.id
        ),
        check(
            "observability_logs_domain_requires_organization",
            sql`${t.domain_id} IS NULL OR ${t.organization_id} IS NOT NULL`
        ),
    ]
)

export const observability_spans = pgTable(
    "observability_spans",
    {
        id: text("id").primaryKey(),
        legacy_id: text("legacy_id"),
        organization_id: text("organization_id").references(
            () => organizations.id,
            { onDelete: "restrict" }
        ),
        domain_id: text("domain_id").references(() => domains.id, {
            onDelete: "restrict",
        }),
        actor_user_id: text("actor_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        span_id: text("span_id").notNull(),
        trace_id: text("trace_id").notNull(),
        parent_span_id: text("parent_span_id"),
        name: text("name").notNull(),
        kind: text("kind").notNull(),
        status: telemetry_span_status("status").notNull(),
        started_at: bigint("started_at", { mode: "number" }).notNull(),
        ended_at: bigint("ended_at", { mode: "number" }),
        attributes: jsonb("attributes").notNull().default({}),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.organization_id],
            foreignColumns: [domains.id, domains.organization_id],
        }).onDelete("restrict"),
        uniqueIndex("observability_spans_legacy_unique").on(t.legacy_id),
        index("observability_spans_created_idx").on(t.created_at, t.id),
        index("observability_spans_organization_created_idx").on(
            t.organization_id,
            t.created_at,
            t.id
        ),
        index("observability_spans_trace_idx").on(t.trace_id, t.started_at),
        check(
            "observability_spans_domain_requires_organization",
            sql`${t.domain_id} IS NULL OR ${t.organization_id} IS NOT NULL`
        ),
    ]
)
