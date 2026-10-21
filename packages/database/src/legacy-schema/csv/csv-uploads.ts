/**
 * # CSV Uploads Schema
 */

import {
    bigint,
    index,
    pgTable,
    uuid,
    varchar,
    integer,
    pgEnum,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const csvUploadStatusEnum = pgEnum("csv_upload_status", [
    "pending",
    "processing",
    "completed",
    "failed",
])

export const csv_uploads = pgTable(
    "csv_uploads",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Upload info
        filename: varchar("filename", { length: 500 }).notNull(),
        row_count: integer("row_count").notNull(),
        status: csvUploadStatusEnum("status").notNull().default("pending"),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_updated: index("csv_uploads_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type CsvUpload = typeof csv_uploads.$inferSelect
export type NewCsvUpload = typeof csv_uploads.$inferInsert
