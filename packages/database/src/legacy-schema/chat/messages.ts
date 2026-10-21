/**
 * # Messages Schema
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

export const messages = pgTable(
    "messages",
    {
        // Primary key - client-generated UUID for TanStack DB optimistic inserts
        id: varchar("id", { length: 255 }).primaryKey(),

        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Message content
        author: varchar("author", { length: 255 }),
        contact_id: varchar("contact_id", { length: 255 }).notNull(),
        body: text("body").notNull(),
        timestamp: bigint("timestamp", { mode: "number" }),

        // Server-set timestamp for LWW conflict resolution
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_contact_updated: index("messages_domain_contact_updated_idx").on(
            table.domain_id,
            table.contact_id,
            table.updated_at
        ),
    })
)

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
