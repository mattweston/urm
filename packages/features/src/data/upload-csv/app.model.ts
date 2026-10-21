import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"

import { PreviewRow } from "./preview.ts"
import { CsvUpload } from "@urm/domain/schemas/csv"

export const Model = S.Struct({
    domain_id: S.String,
    can_write: S.Boolean,
    search: S.String,
    status_filter: S.String,
    preview_id: S.String,
    preview_rows: S.Array(PreviewRow),
    preview_loading: S.Boolean,
    preview_error: S.String,
    preview_page: S.Number,
    loading: S.Boolean,
    error: S.NullOr(S.String),
    uploads: S.Array(CsvUpload),
    uploadDrop: Ui.FileDrop.Model,
    selectedUploadFiles: S.Array(File.File),
    uploadBusy: S.Boolean,
    importedUploadIds: S.Array(S.String),
    pendingDeleteUploadId: S.NullOr(S.String),
    deleteConfirmationDialog: Ui.Dialog.Model,
})

export type Model = typeof Model.Type
