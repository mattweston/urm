import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    check,
    doublePrecision,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

const timestamp = (name: string) => bigint(name, { mode: "number" }).notNull()

export const social_provider_profiles = pgTable(
    "social_provider_profiles",
    {
        domain_id: text("domain_id")
            .primaryKey()
            .references(() => domains.id, { onDelete: "cascade" }),
        provider_profile_id: text("provider_profile_id").notNull(),
        created_at: timestamp("created_at"),
    },
    (t) => [
        uniqueIndex("social_provider_profiles_domain_provider_unique").on(
            t.domain_id,
            t.provider_profile_id
        ),
        uniqueIndex("social_provider_profiles_provider_unique").on(
            t.provider_profile_id
        ),
    ]
)

export const social_accounts = pgTable(
    "social_accounts",
    {
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        account_id: text("account_id").notNull(),
        provider_profile_id: text("provider_profile_id").notNull(),
        platform: text("platform").notNull(),
        username: text("username").notNull(),
        display_name: text("display_name"),
        avatar_url: text("avatar_url"),
        active: boolean("active").notNull(),
        synced_at: timestamp("synced_at"),
    },
    (t) => [
        uniqueIndex("social_accounts_domain_account_unique").on(
            t.domain_id,
            t.account_id
        ),
        uniqueIndex("social_accounts_provider_account_unique").on(t.account_id),
        foreignKey({
            columns: [t.domain_id, t.provider_profile_id],
            foreignColumns: [
                social_provider_profiles.domain_id,
                social_provider_profiles.provider_profile_id,
            ],
        }).onDelete("cascade"),
        index("social_accounts_domain_synced_idx").on(
            t.domain_id,
            t.synced_at,
            t.account_id
        ),
    ]
)

export const social_posts = pgTable(
    "social_posts",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        provider_post_id: text("provider_post_id"),
        idempotency_key: text("idempotency_key").notNull(),
        status: text("status").notNull().default("pending"),
        content: text("content").notNull(),
        account_ids: text("account_ids").array().notNull(),
        media_ids: text("media_ids").array().notNull(),
        media_urls: text("media_urls").array().notNull(),
        platforms: jsonb("platforms").notNull(),
        scheduled_for: bigint("scheduled_for", { mode: "number" }),
        error_message: text("error_message"),
        test_mode: boolean("test_mode").notNull(),
        template_source: jsonb("template_source"),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("social_posts_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("social_posts_domain_key_unique").on(
            t.domain_id,
            t.idempotency_key
        ),
        uniqueIndex("social_posts_provider_id_unique").on(t.provider_post_id),
        index("social_posts_domain_created_idx").on(
            t.domain_id,
            t.created_at,
            t.id
        ),
        check(
            "social_posts_status_check",
            sql`${t.status} IN ('pending','submitting','draft','scheduled','published','partial','failed','cancelled')`
        ),
    ]
)

export const social_provider_events = pgTable(
    "social_provider_events",
    {
        id: text("id").primaryKey(),
        event_type: text("event_type").notNull(),
        provider_post_id: text("provider_post_id").notNull(),
        occurred_at: timestamp("occurred_at"),
        received_at: timestamp("received_at"),
        applied_at: bigint("applied_at", { mode: "number" }),
    },
    (t) => [
        index("social_provider_events_pending_idx").on(
            t.applied_at,
            t.received_at,
            t.id
        ),
    ]
)

export const social_post_edits = pgTable(
    "social_post_edits",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        post_id: text("post_id").notNull(),
        content: text("content").notNull(),
        account_ids: text("account_ids").array().notNull(),
        media_ids: text("media_ids").array().notNull(),
        media_urls: text("media_urls").array().notNull(),
        platforms: jsonb("platforms").notNull(),
        scheduled_for: bigint("scheduled_for", { mode: "number" }),
        test_mode: boolean("test_mode"),
        template_source: jsonb("template_source"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("social_post_edits_domain_post_unique").on(
            t.domain_id,
            t.post_id
        ),
        index("social_post_edits_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
    ]
)

export const social_analytics_snapshots = pgTable(
    "social_analytics_snapshots",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        period: text("period").notNull(),
        platform: text("platform").notNull(),
        account_key: text("account_key").notNull(),
        account_id: text("account_id"),
        post_count: integer("post_count").notNull(),
        metrics: jsonb("metrics").notNull(),
        follower_growth: doublePrecision("follower_growth").notNull(),
        daily: jsonb("daily").notNull(),
        platform_breakdown: jsonb("platform_breakdown").notNull(),
        top_posts: jsonb("top_posts").notNull(),
        warning: text("warning"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        uniqueIndex("social_analytics_domain_filter_unique").on(
            t.domain_id,
            t.period,
            t.platform,
            t.account_key
        ),
        check(
            "social_analytics_period_check",
            sql`${t.period} IN ('7d','30d','90d')`
        ),
        check("social_analytics_post_count_check", sql`${t.post_count} >= 0`),
    ]
)

export const social_templates = pgTable(
    "social_templates",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description").notNull(),
        tags: text("tags").array().notNull(),
        content: text("content").notNull(),
        revision: integer("revision").notNull(),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id),
        updated_by_user_id: text("updated_by_user_id")
            .notNull()
            .references(() => users.id),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (t) => [
        index("social_templates_org_updated_idx").on(
            t.organization_id,
            t.updated_at,
            t.id
        ),
        check("social_templates_revision_check", sql`${t.revision} >= 1`),
    ]
)
