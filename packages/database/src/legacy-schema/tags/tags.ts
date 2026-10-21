/**
 * # `tags`
 */

import {
    bigint,
    index,
    pgTable,
    text,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const tags = pgTable(
    "tags",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Tag definition
        name: varchar("name", { length: 255 }).notNull(),
        color: varchar("color", { length: 50 }).notNull(),
        description: text("description"),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_updated: index("tags_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
