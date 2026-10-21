import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"

import { Image } from "@urm/domain/schemas/media"

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    loading: S.Boolean,
    error: S.NullOr(S.String),
    images: S.Array(Image),
    uploadDrop: Ui.FileDrop.Model,
    selectedUploadFiles: S.Array(File.File),
    uploadPanelOpen: S.Boolean,
    uploadBusy: S.Boolean,
    gallery_editing: S.Boolean,
    selected_gallery_image_id: S.NullOr(S.String),
    editingImageId: S.NullOr(S.String),
    editingAlt: S.String,
    editingText: S.String,
    dragAndDrop: Ui.DragAndDrop.Model,
})

export type Model = typeof Model.Type
