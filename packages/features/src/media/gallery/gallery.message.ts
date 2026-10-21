import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Image } from "@urm/domain/schemas/media"

import {
    ClickedMoveImage,
    ClosedGalleryImage,
    CompletedLayoutMasonry,
    SelectedGalleryImage,
} from "../platform/app.message.ts"

export {
    ClickedMoveImage,
    ClosedGalleryImage,
    CompletedLayoutMasonry,
    SelectedGalleryImage,
}

export const LoadedImages = taggedStruct("LoadedImages", {
    images: S.Array(Image),
})

export const FailedLoadingImages = taggedStruct("FailedLoadingImages", {
    error: S.String,
})

export const ToggledUploadPanel = taggedStruct("ToggledUploadPanel")
export const ToggledGalleryEditing = taggedStruct("ToggledGalleryEditing")
export const GotUploadDropMessage = taggedStruct("GotUploadDropMessage", {
    message: Ui.FileDrop.Message,
})
export const RemovedSelectedUploadFile = taggedStruct(
    "RemovedSelectedUploadFile",
    {
        fileIndex: S.Number,
    }
)
export const ClickedUploadImages = taggedStruct("ClickedUploadImages")
export const UploadedImages = taggedStruct("UploadedImages", {
    images: S.Array(Image),
})
export const UploadImagesFailed = taggedStruct("UploadImagesFailed", {
    error: S.String,
})

export const OpenedImageEditor = taggedStruct("OpenedImageEditor", {
    imageId: S.String,
})
export const ClosedImageEditor = taggedStruct("ClosedImageEditor")
export const EditingAltChanged = taggedStruct("EditingAltChanged", {
    value: S.String,
})
export const EditingTextChanged = taggedStruct("EditingTextChanged", {
    value: S.String,
})
export const ClickedSaveImageEdits = taggedStruct("ClickedSaveImageEdits")
export const SavedImageEdits = taggedStruct("SavedImageEdits", {
    image: Image,
})
export const ImageEditsSaveFailed = taggedStruct("ImageEditsSaveFailed", {
    error: S.String,
})

export const ClickedDeleteImage = taggedStruct("ClickedDeleteImage", {
    imageId: S.String,
})
export const DeletedImage = taggedStruct("DeletedImage", {
    imageId: S.String,
})
export const DeleteImageFailed = taggedStruct("DeleteImageFailed", {
    error: S.String,
})

export const ReorderedImages = taggedStruct("ReorderedImages")
export const ReorderImagesFailed = taggedStruct("ReorderImagesFailed", {
    error: S.String,
})

export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})

export const Message = S.Union([
    LoadedImages,
    FailedLoadingImages,
    ToggledUploadPanel,
    ToggledGalleryEditing,
    ClickedMoveImage,
    SelectedGalleryImage,
    ClosedGalleryImage,
    GotUploadDropMessage,
    RemovedSelectedUploadFile,
    ClickedUploadImages,
    UploadedImages,
    UploadImagesFailed,
    OpenedImageEditor,
    ClosedImageEditor,
    EditingAltChanged,
    EditingTextChanged,
    ClickedSaveImageEdits,
    SavedImageEdits,
    ImageEditsSaveFailed,
    ClickedDeleteImage,
    DeletedImage,
    DeleteImageFailed,
    ReorderedImages,
    ReorderImagesFailed,
    CompletedLayoutMasonry,
    GotDragAndDropMessage,
])

export type Message = typeof Message.Type
