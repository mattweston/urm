import { Schema } from "effect"
import { CsvUpload, CsvData } from "./schemas/csv.ts"
import {
    DataColumns,
    RawRow,
    TableDefinition,
    TableRow,
} from "./schemas/data-tables.ts"

export const DataWorkspace = Schema.Struct({
    id: Schema.String,
    can_write: Schema.Boolean,
    uploads: Schema.Array(CsvUpload),
    tables: Schema.Array(TableDefinition),
})
export type DataWorkspace = typeof DataWorkspace.Type

export const DataTableRows = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    rows: Schema.Array(TableRow),
})
export type DataTableRows = typeof DataTableRows.Type

export const DataUploadRows = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    rows: Schema.Array(CsvData),
})
export type DataUploadRows = typeof DataUploadRows.Type

export const DataAction = Schema.Union([
    Schema.TaggedStruct("StoreCsv", {
        id: Schema.String,
        filename: Schema.Trimmed.check(
            Schema.isMinLength(1),
            Schema.isMaxLength(500)
        ),
        rows: Schema.Array(RawRow).check(
            Schema.isMinLength(1),
            Schema.isMaxLength(1000)
        ),
    }),
    Schema.TaggedStruct("DeleteCsv", { id: Schema.String }),
    Schema.TaggedStruct("RecordContactImport", { upload_id: Schema.String }),
    Schema.TaggedStruct("CreateTable", {
        id: Schema.String,
        name: Schema.Trimmed.check(
            Schema.isMinLength(1),
            Schema.isMaxLength(100)
        ),
        columns: DataColumns,
    }),
    Schema.TaggedStruct("AppendRows", {
        table_id: Schema.String,
        schema_revision: Schema.Int,
        rows: Schema.Array(RawRow).check(
            Schema.isMinLength(1),
            Schema.isMaxLength(200)
        ),
        row_ids: Schema.Array(Schema.String).check(
            Schema.isMinLength(1),
            Schema.isMaxLength(200)
        ),
        upload_id: Schema.optional(Schema.String),
    }),
    Schema.TaggedStruct("UpdateRow", {
        table_id: Schema.String,
        row_id: Schema.String,
        schema_revision: Schema.Int,
        row_revision: Schema.Int,
        values: RawRow,
    }),
])
export type DataAction = typeof DataAction.Type

export class DataWriteError extends Schema.TaggedError<DataWriteError>()(
    "DataWriteError",
    { message: Schema.String }
) {}
