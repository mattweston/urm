import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { PreviewRow } from "./preview.ts"
import { CsvUpload } from "@urm/domain/schemas/csv"

export const LoadedUploads = taggedStruct("LoadedUploads", {
    uploads: S.Array(CsvUpload),
})

export const FailedLoadingUploads = taggedStruct("FailedLoadingUploads", {
    error: S.String,
})

export const GotUploadDropMessage = taggedStruct("GotUploadDropMessage", {
    message: Ui.FileDrop.Message,
})

export const RemovedSelectedUploadFile = taggedStruct(
    "RemovedSelectedUploadFile",
    {
        fileIndex: S.Number,
    }
)

export const RetriedUpload = taggedStruct("RetriedUpload", {
    upload_id: S.String,
})
export const ClickedUploadCsv = taggedStruct("ClickedUploadCsv")
export const UploadedCsv = taggedStruct("UploadedCsv")
export const UploadCsvFailed = taggedStruct("UploadCsvFailed", {
    error: S.String,
})

export const ClickedImportUpload = taggedStruct("ClickedImportUpload", {
    uploadId: S.String,
})

export const ImportedUpload = taggedStruct("ImportedUpload", {
    uploadId: S.String,
})

export const ImportUploadFailed = taggedStruct("ImportUploadFailed", {
    error: S.String,
})

export const ClickedDeleteUpload = taggedStruct("ClickedDeleteUpload", {
    uploadId: S.String,
})

export const GotDeleteConfirmationDialogMessage = taggedStruct(
    "GotDeleteConfirmationDialogMessage",
    {
        message: Ui.Dialog.Message,
    }
)

export const ConfirmedDeleteUpload = taggedStruct("ConfirmedDeleteUpload")

export const DeletedUpload = taggedStruct("DeletedUpload", {
    uploadId: S.String,
})

export const DeleteUploadFailed = taggedStruct("DeleteUploadFailed", {
    error: S.String,
})

export const CompletedPreviewFocus = taggedStruct("CompletedPreviewFocus")
export const ChangedUploadSearch = taggedStruct("ChangedUploadSearch", {
    value: S.String,
})
export const ChangedUploadStatus = taggedStruct("ChangedUploadStatus", {
    value: S.String,
})
export const ClickedPreviewUpload = taggedStruct("ClickedPreviewUpload", {
    upload_id: S.String,
})
export const ClosedUploadPreview = taggedStruct("ClosedUploadPreview")
export const ChangedPreviewPage = taggedStruct("ChangedPreviewPage", {
    page: S.Number,
})
export const LoadedUploadPreview = taggedStruct("LoadedUploadPreview", {
    domain_id: S.String,
    upload_id: S.String,
    rows: S.Array(PreviewRow),
})
export const FailedUploadPreview = taggedStruct("FailedUploadPreview", {
    domain_id: S.String,
    upload_id: S.String,
    error: S.String,
})
export const ClickedTableImport = taggedStruct("ClickedTableImport", {
    upload_id: S.String,
})

export const Message = S.Union([
    CompletedPreviewFocus,
    ChangedUploadSearch,
    ChangedUploadStatus,
    ClickedPreviewUpload,
    ClosedUploadPreview,
    ChangedPreviewPage,
    LoadedUploadPreview,
    FailedUploadPreview,
    ClickedTableImport,
    LoadedUploads,
    FailedLoadingUploads,
    GotUploadDropMessage,
    RemovedSelectedUploadFile,
    ClickedUploadCsv,
    RetriedUpload,
    UploadedCsv,
    UploadCsvFailed,
    ClickedImportUpload,
    ImportedUpload,
    ImportUploadFailed,
    ClickedDeleteUpload,
    GotDeleteConfirmationDialogMessage,
    ConfirmedDeleteUpload,
    DeletedUpload,
    DeleteUploadFailed,
])

export type Message = typeof Message.Type
