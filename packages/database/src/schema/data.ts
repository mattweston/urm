import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"

export const csv_uploads = pgTable(
    "csv_uploads",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        filename: text("filename").notNull(),
        uploader_id: text("uploader_id").notNull(),
        uploader_name: text("uploader_name").notNull(),
        imports: jsonb("imports").notNull().default(sql`'[]'::jsonb`),
        row_count: integer("row_count").notNull(),
        status: text("status").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        uniqueIndex("csv_uploads_domain_id_unique").on(t.domain_id, t.id),
        index("csv_uploads_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        check(
            "csv_uploads_row_count_check",
            sql`${t.row_count} BETWEEN 1 AND 1000`
        ),
        check(
            "csv_uploads_status_check",
            sql`${t.status} IN ('processing','completed','failed')`
        ),
        check(
            "csv_uploads_filename_check",
            sql`length(${t.filename}) BETWEEN 1 AND 500`
        ),
    ]
)

export const csv_data = pgTable(
    "csv_data",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id").notNull(),
        upload_id: text("upload_id").notNull(),
        row_index: integer("row_index").notNull(),
        data: text("data").notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        uniqueIndex("csv_data_upload_row_unique").on(t.upload_id, t.row_index),
        index("csv_data_domain_upload_idx").on(
            t.domain_id,
            t.upload_id,
            t.row_index
        ),
        foreignKey({
            columns: [t.domain_id, t.upload_id],
            foreignColumns: [csv_uploads.domain_id, csv_uploads.id],
        }).onDelete("cascade"),
        check("csv_data_index_check", sql`${t.row_index} BETWEEN 0 AND 999`),
        check("csv_data_length_check", sql`length(${t.data}) <= 100000`),
    ]
)

export const data_tables = pgTable(
    "data_tables",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        columns: jsonb("columns").notNull(),
        revision: integer("revision").notNull().default(1),
        row_count: integer("row_count").notNull().default(0),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        uniqueIndex("data_tables_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("data_tables_domain_name_unique").on(
            t.domain_id,
            sql`lower(${t.name})`
        ),
        index("data_tables_domain_updated_idx").on(
            t.domain_id,
            t.updated_at,
            t.id
        ),
        check(
            "data_tables_name_check",
            sql`length(${t.name}) BETWEEN 1 AND 100`
        ),
        check("data_tables_revision_check", sql`${t.revision} >= 1`),
        check(
            "data_tables_row_count_check",
            sql`${t.row_count} BETWEEN 0 AND 1000`
        ),
    ]
)

export const data_table_rows = pgTable(
    "data_table_rows",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id").notNull(),
        table_id: text("table_id").notNull(),
        position: integer("position").notNull(),
        values: jsonb("values").notNull(),
        revision: integer("revision").notNull().default(1),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        index("data_table_rows_domain_table_idx").on(
            t.domain_id,
            t.table_id,
            t.position,
            t.id
        ),
        uniqueIndex("data_table_rows_table_position_unique").on(t.table_id, t.position),
        foreignKey({
            columns: [t.domain_id, t.table_id],
            foreignColumns: [data_tables.domain_id, data_tables.id],
        }).onDelete("cascade"),
        check("data_table_rows_revision_check", sql`${t.revision} >= 1`),
        check("data_table_rows_position_check", sql`${t.position} >= 0`),
    ]
)
