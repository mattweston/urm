import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const publication_status = pgEnum("publication_status", [
    "draft",
    "live",
    "disabled",
])
export const publication_access = pgEnum("publication_access", [
    "public",
    "link",
    "password",
])
export const module_id = pgEnum("module_id", [
    "Documents",
    "Blog",
    "Projects",
    "Shop",
    "Finance",
    "Issues",
    "Events",
    "Tags",
    "Mail",
    "Media",
    "Data",
    "Learn",
])

export const domains = pgTable(
    "domains",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "restrict" }),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
        created_at: bigint("created_at", { mode: "number" }),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        enabled_modules: module_id("enabled_modules").array(),
        module_settings_version: integer("module_settings_version"),
        publication_status: publication_status("publication_status").notNull(),
        publication_access: publication_access("publication_access").notNull(),
        development_release_id: text("development_release_id"),
        development_deployment_id: text("development_deployment_id"),
        staging_release_id: text("staging_release_id"),
        staging_deployment_id: text("staging_deployment_id"),
        production_release_id: text("production_release_id"),
        production_deployment_id: text("production_deployment_id"),
    },
    (table) => [
        uniqueIndex("domains_slug_unique").on(table.slug),
        uniqueIndex("domains_id_organization_unique").on(
            table.id,
            table.organization_id
        ),
        index("domains_organization_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
        index("domains_created_by_user_idx").on(table.created_by_user_id),
        index("domains_updated_at_idx").on(table.updated_at, table.id),
        check(
            "domains_slug_format",
            sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
        ),
    ]
)

export type Domain = typeof domains.$inferSelect
export type NewDomain = typeof domains.$inferInsert
