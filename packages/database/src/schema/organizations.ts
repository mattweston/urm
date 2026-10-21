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

export const organization_kind = pgEnum("organization_kind", [
    "personal",
    "customer",
])

export const organizations = pgTable(
    "organizations",
    {
        id: text("id").primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
        kind: organization_kind("kind").notNull(),
        max_domains: integer("max_domains").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [
        uniqueIndex("organizations_slug_unique").on(table.slug),
        index("organizations_updated_at_idx").on(table.updated_at, table.id),
        check(
            "organizations_max_domains_positive",
            sql`${table.max_domains} >= 1`
        ),
        check(
            "organizations_slug_format",
            sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
        ),
    ]
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
