/**
 * # Documents Schema
 */

import {
    pgTable,
    varchar,
    boolean,
    integer,
    text,
    pgEnum,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const contentTypeEnum = pgEnum("content_type", [
    "markdown",
    "html",
    "plain",
])

export const documents = pgTable(
    "documents",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Document info
        title: varchar("title", { length: 500 }).notNull(),
        content: text("content").notNull(),
        content_type: contentTypeEnum("content_type")
            .notNull()
            .default("markdown"),
        slug: varchar("slug", { length: 500 }),

        // Status
        published: boolean("published").notNull().default(false),

        // Timestamps
        created_at: integer("created_at").notNull(),
        updated_at: integer("updated_at").notNull(),
        deleted_at: integer("deleted_at"),
    },
    (table) => ({
        domain_updated: index("documents_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
