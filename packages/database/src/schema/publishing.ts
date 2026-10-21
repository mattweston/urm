import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    foreignKey,
    index,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { subdomains } from "./blog.ts"
import { users } from "./users.ts"

export const publication_releases = pgTable(
    "publication_releases",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id),
        subdomain_id: text("subdomain_id"),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id),
        idempotency_key: text("idempotency_key").notNull(),
        status: text("status").notNull(),
        snapshot: jsonb("snapshot").notNull(),
        asset_sources: jsonb("asset_sources").notNull().default([]),
        artifact_checksum: text("artifact_checksum"),
        error_message: text("error_message"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        completed_at: bigint("completed_at", { mode: "number" }),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.subdomain_id],
            foreignColumns: [subdomains.domain_id, subdomains.id],
        }),
        uniqueIndex("publication_releases_root_key_unique")
            .on(table.domain_id, table.idempotency_key)
            .where(sql`${table.subdomain_id} IS NULL`),
        uniqueIndex("publication_releases_subdomain_key_unique")
            .on(table.domain_id, table.subdomain_id, table.idempotency_key)
            .where(sql`${table.subdomain_id} IS NOT NULL`),
        index("publication_releases_owner_created_idx").on(
            table.domain_id,
            table.subdomain_id,
            table.created_at,
            table.id
        ),
    ]
)

// Each publication deployment has one durable job and one lifecycle.
export const publication_deployment_jobs = pgTable(
    "publication_deployment_jobs",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id),
        release_id: text("release_id")
            .notNull()
            .references(() => publication_releases.id),
        requested_by_user_id: text("requested_by_user_id")
            .notNull()
            .references(() => users.id),
        session_id: text("session_id").notNull(),
        subdomain_id: text("subdomain_id"),
        is_preview: boolean("is_preview").notNull().default(false),
        channel: text("channel").notNull().default("development"),
        idempotency_key: text("idempotency_key").notNull(),
        status: text("status").notNull(),
        artifact_checksum: text("artifact_checksum").notNull(),
        url: text("url"),
        error_message: text("error_message"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        completed_at: bigint("completed_at", { mode: "number" }),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.subdomain_id],
            foreignColumns: [subdomains.domain_id, subdomains.id],
        }),
        uniqueIndex("publication_deployment_jobs_key_unique").on(
            table.domain_id,
            table.idempotency_key
        ),
        uniqueIndex("publication_deployment_jobs_root_active_unique")
            .on(table.domain_id)
            .where(
                sql`${table.subdomain_id} IS NULL AND ${table.status} IN ('pending','running')`
            ),
        uniqueIndex("publication_deployment_jobs_subdomain_active_unique")
            .on(table.domain_id, table.subdomain_id)
            .where(
                sql`${table.subdomain_id} IS NOT NULL AND ${table.status} IN ('pending','running')`
            ),
        index("publication_deployment_jobs_owner_created_idx").on(
            table.domain_id,
            table.created_at
        ),
    ]
)
