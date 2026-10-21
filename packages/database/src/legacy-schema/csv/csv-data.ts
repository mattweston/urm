/**
 * # CSV Data Schema
 */

// TODO DUPLICATED TYPES in SERVER + SHARED

import { bigint, pgTable, varchar, integer, text } from "drizzle-orm/pg-core"

export const csv_data = pgTable("csv_data", {
    // Primary key - external ID
    id: varchar("id", { length: 255 }).primaryKey(),

    // Upload reference
    upload_id: varchar("upload_id", { length: 255 }).notNull(),

    // Row data
    row_index: integer("row_index").notNull(),
    data: text("data").notNull(), // JSON string of row data

    // Timestamps
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export type CsvData = typeof csv_data.$inferSelect
export type NewCsvData = typeof csv_data.$inferInsert
