/**
 * Images schema - Image assets
 */

import {
    index,
    pgTable,
    uuid,
    varchar,
    bigint,
    integer,
    text,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const images = pgTable(
    "images",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),

        // Owning domain. Images are never shared across domain records.
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Image info
        url: varchar("url", { length: 2048 }).notNull(),
        alt: varchar("alt", { length: 500 }).notNull(),
        text: text("text").notNull(),

        // Dimensions
        width: integer("width"),
        height: integer("height"),

        // Organization
        category: varchar("category", { length: 100 }),
        order_position: integer("order_position").notNull().default(0),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_updated: index("images_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Image = typeof images.$inferSelect
export type NewImage = typeof images.$inferInsert
