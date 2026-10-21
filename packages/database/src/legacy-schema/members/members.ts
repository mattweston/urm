/**
 * # Members schema
 */

import {
    pgTable,
    varchar,
    bigint,
    text,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const members = pgTable(
    "members",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),

        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Name
        first: varchar("first", { length: 255 }).notNull(),
        last: varchar("last", { length: 255 }).notNull(),

        // Social
        twitter: varchar("twitter", { length: 255 }),
        avatar: varchar("avatar", { length: 2048 }),

        // Notes
        notes: text("notes"),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_updated: index("members_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Member = typeof members.$inferSelect
export type NewMember = typeof members.$inferInsert
