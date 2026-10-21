import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import * as CsvUpload from "./upload-csv/index.ts"

import * as Tables from "./tables/message.ts"

export const GotTableMessage = taggedStruct("GotTableMessage", {
    message: Tables.Message,
})
export const ChangedPath = taggedStruct("ChangedPath", { pathname: S.String })
export const GotCsvUploadMessage = taggedStruct("GotCsvUploadMessage", {
    message: CsvUpload.Message,
})

export const SelectedImportTable = taggedStruct("SelectedImportTable", {
    table_id: S.String,
})
export const ClosedCsvImport = taggedStruct("ClosedCsvImport")
export const CompletedImportFocus = taggedStruct("CompletedImportFocus")

export const Message = S.Union([
    SelectedImportTable,
    ClosedCsvImport,
    CompletedImportFocus,
    ChangedPath,
    GotTableMessage,
    GotCsvUploadMessage,
])
export type Message = typeof Message.Type
