import { Schema as S } from "effect"
import { FileDrop } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { ImageSettings } from "./gallery.presentation.ts"
import { Gallery3dEditRoute } from "./gallery.route.ts"

const GalleryTextField = S.Literals([
    "title",
    "artist",
    "year",
    "medium",
    "dimensions",
    "price",
    "description",
])

export const ClickedFrame = taggedStruct("ClickedFrame", { frameKey: S.String })
export const ClickedDetails = taggedStruct("ClickedDetails", {
    frameKey: S.String,
})
export const ClickedArtworkList = taggedStruct("ClickedArtworkList")
export const ClickedArtworkListItem = taggedStruct("ClickedArtworkListItem", {
    frameKey: S.String,
})
export const ClickedCloseEditor = taggedStruct("ClickedCloseEditor")
export const ClickedResetView = taggedStruct("ClickedResetView")
export const ChangedGalleryRoute = taggedStruct("ChangedGalleryRoute", {
    route: Gallery3dEditRoute,
})
export const CompletedNavigateGallery = taggedStruct("CompletedNavigateGallery")
export const HoveredFrame = taggedStruct("HoveredFrame", { frameKey: S.String })
export const UnhoveredFrame = taggedStruct("UnhoveredFrame")
export const SucceededMountGallery = taggedStruct("SucceededMountGallery")
export const FailedMountGallery = taggedStruct("FailedMountGallery", {
    reason: S.String,
})
export const CompletedLoadImages = taggedStruct("CompletedLoadImages")
export const FailedLoadImages = taggedStruct("FailedLoadImages", {
    error: S.String,
})
export const SucceededFocusFrame = taggedStruct("SucceededFocusFrame", {
    frameKey: S.String,
})
export const FailedFocusFrame = taggedStruct("FailedFocusFrame", {
    frameKey: S.String,
    error: S.String,
})
export const SucceededResetCamera = taggedStruct("SucceededResetCamera")
export const FailedResetCamera = taggedStruct("FailedResetCamera", {
    error: S.String,
})
export const GotFileDropMessage = taggedStruct("GotFileDropMessage", {
    message: FileDrop.Message,
})
export const ClickedRestoreFrameImage = taggedStruct(
    "ClickedRestoreFrameImage",
    {
        frameKey: S.String,
    }
)
export const SucceededReplaceFrameImage = taggedStruct(
    "SucceededReplaceFrameImage",
    {
        frameKey: S.String,
        objectUrl: S.String,
    }
)
export const FailedReplaceFrameImage = taggedStruct("FailedReplaceFrameImage", {
    frameKey: S.String,
    error: S.String,
})
export const SucceededRestoreFrameImage = taggedStruct(
    "SucceededRestoreFrameImage",
    {
        frameKey: S.String,
    }
)
export const FailedRestoreFrameImage = taggedStruct("FailedRestoreFrameImage", {
    frameKey: S.String,
    error: S.String,
})
export const ChangedGalleryText = taggedStruct("ChangedGalleryText", {
    frameKey: S.String,
    field: GalleryTextField,
    value: S.String,
})

export const ClickedEditArtwork = taggedStruct("ClickedEditArtwork")
export const ClickedBrowseArtwork = taggedStruct("ClickedBrowseArtwork", {
    direction: S.Literals([-1, 1]),
})
export const ToggledGridView = taggedStruct("ToggledGridView")
export const ClickedRetryImages = taggedStruct("ClickedRetryImages")
export const UpdatedTextureState = taggedStruct("UpdatedTextureState", {
    frame_key: S.String,
    status: S.Literals(["loading", "loaded", "failed"]),
})
export const ChangedImageSettings = taggedStruct("ChangedImageSettings", {
    frame_key: S.String,
    settings: ImageSettings,
})
export const CompletedSyncScene = taggedStruct("CompletedSyncScene")
export const FailedSyncScene = taggedStruct("FailedSyncScene", {
    error: S.String,
})

export const Message = S.Union([
    ClickedEditArtwork,
    ClickedBrowseArtwork,
    ToggledGridView,
    ClickedRetryImages,
    UpdatedTextureState,
    ChangedImageSettings,
    CompletedSyncScene,
    FailedSyncScene,
    ClickedFrame,
    ClickedDetails,
    ClickedArtworkList,
    ClickedArtworkListItem,
    ClickedCloseEditor,
    ClickedResetView,
    ChangedGalleryRoute,
    CompletedNavigateGallery,
    HoveredFrame,
    UnhoveredFrame,
    SucceededMountGallery,
    FailedMountGallery,
    CompletedLoadImages,
    FailedLoadImages,
    SucceededFocusFrame,
    FailedFocusFrame,
    SucceededResetCamera,
    FailedResetCamera,
    GotFileDropMessage,
    ClickedRestoreFrameImage,
    SucceededReplaceFrameImage,
    FailedReplaceFrameImage,
    SucceededRestoreFrameImage,
    FailedRestoreFrameImage,
    ChangedGalleryText,
])
export type Message = typeof Message.Type
