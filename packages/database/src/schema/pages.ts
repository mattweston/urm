import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { subdomains } from "./blog.ts"

export const pages = pgTable(
    "pages",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        subdomain_id: text("subdomain_id"),
        title: text("title").notNull(),
        content: text("content").notNull(),
        content_type: text("content_type").notNull(),
        slug: text("slug"),
        navigation_label: text("navigation_label").notNull(),
        show_in_navigation: boolean("show_in_navigation").notNull(),
        order_position: integer("order_position").notNull(),
        is_homepage: boolean("is_homepage").notNull(),
        publication_state: text("publication_state").notNull(),
        seo_title: text("seo_title"),
        seo_description: text("seo_description"),
        noindex: boolean("noindex").notNull(),
        template_source: jsonb("template_source"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.subdomain_id],
            foreignColumns: [subdomains.domain_id, subdomains.id],
        }),
        uniqueIndex("pages_root_slug_unique")
            .on(table.domain_id, table.slug)
            .where(sql`${table.subdomain_id} IS NULL`),
        uniqueIndex("pages_subdomain_slug_unique")
            .on(table.domain_id, table.subdomain_id, table.slug)
            .where(sql`${table.subdomain_id} IS NOT NULL`),
        uniqueIndex("pages_root_homepage_unique")
            .on(table.domain_id)
            .where(sql`${table.subdomain_id} IS NULL AND ${table.is_homepage}`),
        uniqueIndex("pages_subdomain_homepage_unique")
            .on(table.domain_id, table.subdomain_id)
            .where(
                sql`${table.subdomain_id} IS NOT NULL AND ${table.is_homepage}`
            ),
        uniqueIndex("pages_root_landing_unique")
            .on(table.domain_id)
            .where(
                sql`${table.subdomain_id} IS NULL AND ${table.content_type} = 'landing_json'`
            ),
        uniqueIndex("pages_subdomain_landing_unique")
            .on(table.domain_id, table.subdomain_id)
            .where(
                sql`${table.subdomain_id} IS NOT NULL AND ${table.content_type} = 'landing_json'`
            ),
        index("pages_owner_order_idx").on(
            table.domain_id,
            table.subdomain_id,
            table.order_position,
            table.id
        ),
    ]
)

export const landing_page_archives = pgTable("landing_page_archives", {
    id: text("id").primaryKey(),
    domain_id: text("domain_id").notNull(),
    subdomain_id: text("subdomain_id"),
    archived_page: jsonb("archived_page").notNull(),
    archived_at: bigint("archived_at", { mode: "number" }).notNull(),
    reason: text("reason").notNull(),
})
