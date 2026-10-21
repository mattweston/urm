/**
 * # Events Schema
 */

import {
    pgTable,
    varchar,
    boolean,
    bigint,
    text,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const events = pgTable(
    "events",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Event info
        title: varchar("title", { length: 500 }).notNull(),
        description: text("description"),

        // Date and time
        date: bigint("date", { mode: "number" }).notNull(), // Unix timestamp
        start_time: varchar("start_time", { length: 10 }).notNull(), // HH:MM format
        end_time: varchar("end_time", { length: 10 }),

        // Venue
        venue_name: varchar("venue_name", { length: 500 }).notNull(),
        venue_url: varchar("venue_url", { length: 2048 }),
        latitude: varchar("latitude", { length: 50 }).notNull(),
        longitude: varchar("longitude", { length: 50 }).notNull(),

        // Tickets and media
        tickets_url: varchar("tickets_url", { length: 2048 }),
        image_url: varchar("image_url", { length: 2048 }),

        // Status
        published: boolean("published").notNull().default(false),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_updated: index("events_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
