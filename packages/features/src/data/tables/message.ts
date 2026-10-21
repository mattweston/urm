import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import * as Spreadsheet from "../../spreadsheet/index.ts"
import {
    DataColumns,
    RawRow,
    TableDefinition,
    TableRow,
} from "@urm/domain/schemas/data-tables"

export const Request = S.Union([
    S.TaggedStruct("Create", { name: S.String, columns: DataColumns }),
    S.TaggedStruct("ReadUpload", { upload_id: S.String }),
    S.TaggedStruct("ImportContacts", {
        rows: S.Array(RawRow),
        upload_id: S.String,
    }),
    S.TaggedStruct("Append", {
        upload_id: S.optional(S.String),
        table_id: S.String,
        schema_revision: S.Number,
        rows: S.Array(RawRow),
    }),
    S.TaggedStruct("UpdateRow", {
        table_id: S.String,
        schema_revision: S.Number,
        row_id: S.String,
        row_revision: S.Number,
        values: RawRow,
    }),
])
export type Request = typeof Request.Type
export const GotSpreadsheetMessage = taggedStruct("GotSpreadsheetMessage", {
    message: Spreadsheet.Message,
})
export const LoadedTables = taggedStruct("LoadedTables", {
    domain_id: S.String,
    can_write: S.Boolean,
    tables: S.Array(TableDefinition),
})
export const LoadedRows = taggedStruct("LoadedRows", {
    domain_id: S.String,
    table_id: S.String,
    rows: S.Array(TableRow),
})
export const SelectedTable = taggedStruct("SelectedTable", { id: S.String })
export const StartedCreate = taggedStruct("StartedCreate")
export const SelectedTemplate = taggedStruct("SelectedTemplate", {
    id: S.String,
})
export const ChangedName = taggedStruct("ChangedName", { value: S.String })
export const AddedColumn = taggedStruct("AddedColumn")
export const RemovedColumn = taggedStruct("RemovedColumn", { index: S.Number })
export const ChangedColumn = taggedStruct("ChangedColumn", {
    index: S.Number,
    field: S.Literals([
        "name",
        "key",
        "type",
        "required",
        "choices",
        "default_value",
    ]),
    value: S.String,
})
export const SubmittedCreate = taggedStruct("SubmittedCreate")
export const SelectedUpload = taggedStruct("SelectedUpload", { id: S.String })
export const ReadUpload = taggedStruct("ReadUpload")
export const ChangedMapping = taggedStruct("ChangedMapping", {
    key: S.String,
    value: S.String,
})
export const PreviewedImport = taggedStruct("PreviewedImport")
export const SubmittedImport = taggedStruct("SubmittedImport")
export const StartedRow = taggedStruct("StartedRow", { id: S.String })
export const ChangedCell = taggedStruct("ChangedCell", {
    key: S.String,
    value: S.String,
})
export const SubmittedRow = taggedStruct("SubmittedRow")
export const CancelledEdit = taggedStruct("CancelledEdit")
export const ChangedPage = taggedStruct("ChangedPage", { page: S.Number })
export const CompletedRequest = taggedStruct("CompletedRequest", {
    domain_id: S.String,
    created_id: S.String,
    source_rows: S.Array(RawRow),
    operation: S.Literals([
        "Create",
        "ReadUpload",
        "Append",
        "UpdateRow",
        "ImportContacts",
    ]),
})
export const FailedRequest = taggedStruct("FailedRequest", {
    domain_id: S.String,
    error: S.String,
})
export const Message = S.Union([
    GotSpreadsheetMessage,
    LoadedTables,
    LoadedRows,
    SelectedTable,
    StartedCreate,
    SelectedTemplate,
    ChangedName,
    AddedColumn,
    RemovedColumn,
    ChangedColumn,
    SubmittedCreate,
    SelectedUpload,
    ReadUpload,
    ChangedMapping,
    PreviewedImport,
    SubmittedImport,
    StartedRow,
    ChangedCell,
    SubmittedRow,
    CancelledEdit,
    ChangedPage,
    CompletedRequest,
    FailedRequest,
])
export type Message = typeof Message.Type
