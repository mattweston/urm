/**
 * # Preferences schema
 */

import { pgTable, varchar, boolean, bigint } from "drizzle-orm/pg-core"

export const preferences = pgTable("preferences", {
    // Primary key - external ID for compatibility
    id: varchar("id", { length: 255 }).primaryKey(),

    contact_id: varchar("contact_id", { length: 255 }).notNull(),

    // Preferences
    theme: varchar("theme", { length: 50 }).notNull().default("light"),
    language: varchar("language", { length: 10 }).notNull().default("en"),
    notifications: boolean("notifications").notNull().default(true),

    // Timestamps
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export type Preference = typeof preferences.$inferSelect
export type NewPreference = typeof preferences.$inferInsert
