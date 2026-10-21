import { sql } from "drizzle-orm"
import {
    pgTable,
    text,
    jsonb,
    boolean,
    foreignKey,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { subdomains } from "./blog.ts"

export const publication_configurations = pgTable(
    "publication_configurations",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id),
        subdomain_id: text("subdomain_id"),
        layout: jsonb("layout"),
        navigation: jsonb("navigation").notNull().default([]),
        events_included: boolean("events_included").notNull().default(false),
        blog_included: boolean("blog_included").notNull().default(true),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.subdomain_id],
            foreignColumns: [subdomains.domain_id, subdomains.id],
        }),
        uniqueIndex("publication_configurations_root_unique")
            .on(table.domain_id)
            .where(sql`${table.subdomain_id} IS NULL`),
        uniqueIndex("publication_configurations_subdomain_unique")
            .on(table.domain_id, table.subdomain_id)
            .where(sql`${table.subdomain_id} IS NOT NULL`),
    ]
)
