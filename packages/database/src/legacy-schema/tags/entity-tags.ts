/**
 * # Entity tags schema
 */

import { bigint, pgTable, varchar } from "drizzle-orm/pg-core"

export const entity_tags = pgTable("entity_tags", {
    // Primary key - external ID
    id: varchar("id", { length: 255 }).primaryKey(),

    // Entity reference (polymorphic)
    entity_type: varchar("entity_type", { length: 100 }).notNull(),
    entity_id: varchar("entity_id", { length: 255 }).notNull(),

    // Tag reference
    tag_id: varchar("tag_id", { length: 255 }).notNull(),

    // Timestamps
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export type EntityTag = typeof entity_tags.$inferSelect
export type NewEntityTag = typeof entity_tags.$inferInsert
