import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Image } from "@urm/domain/schemas/media"
import { EntityTag, Tag } from "@urm/domain/schemas/tags"
import { Message as SidebarTooltipMessageSchema } from "@foldkit/ui/tooltip"
import * as YouTubeEmbed from "../../labs/media/youtube-embed/submodel.ts"
import { Video } from "../video/video.ts"
import { ViewMode } from "./app.model.ts"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./route.message.ts"

export const LoadedImages = taggedStruct("LoadedImages", {
    images: S.Array(Image),
})

export const LoadedMedia = taggedStruct("LoadedMedia", {
    images: S.Array(Image),
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
    videos: S.Array(Video),
})

export const FailedLoadingImages = taggedStruct("FailedLoadingImages", {
    error: S.String,
})

export const SearchQueryChanged = taggedStruct("SearchQueryChanged", {
    value: S.String,
})

export const CategoryFilterChanged = taggedStruct("CategoryFilterChanged", {
    value: S.String,
})

export const ChangedViewMode = taggedStruct("ChangedViewMode", {
    mode: ViewMode,
})

export const ToggledUploadPanel = taggedStruct("ToggledUploadPanel")
export const ToggledGalleryEditing = taggedStruct("ToggledGalleryEditing")
export const ClickedMoveImage = taggedStruct("ClickedMoveImage", {
    imageId: S.String,
    direction: S.Literals(["earlier", "later"]),
})
export const SelectedGalleryImage = taggedStruct("SelectedGalleryImage", {
    imageId: S.String,
})
export const ClosedGalleryImage = taggedStruct("ClosedGalleryImage")
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
export const RequestedUploadImages = taggedStruct("RequestedUploadImages", {
    files: S.NonEmptyArray(File.File),
})
export const UploadedImages = taggedStruct("UploadedImages", {
    images: S.Array(Image),
})
export const UploadImagesFailed = taggedStruct("UploadImagesFailed", {
    error: S.String,
})
export const ResolvedImageUrls = taggedStruct("ResolvedImageUrls", {
    images: S.Array(
        S.Struct({
            stored_url: S.String,
            url: S.String,
        })
    ),
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
export const EditingCategoryChanged = taggedStruct("EditingCategoryChanged", {
    value: S.String,
})
export const ClickedSaveImageEdits = taggedStruct("ClickedSaveImageEdits")
export const SavedImageEdits = taggedStruct("SavedImageEdits", {
    image: Image,
})
export const ImageEditsSaveFailed = taggedStruct("ImageEditsSaveFailed", {
    error: S.String,
})

// The gallery deletes straight from the card; the library asks first, so it
// opens the dialog with RequestedDeleteImage and only then reaches
// ClickedDeleteImage through ConfirmedDeleteImage.
export const RequestedDeleteImage = taggedStruct("RequestedDeleteImage", {
    imageId: S.String,
})
export const CancelledDeleteImage = taggedStruct("CancelledDeleteImage")
export const ConfirmedDeleteImage = taggedStruct("ConfirmedDeleteImage")

export const ClickedDeleteImage = taggedStruct("ClickedDeleteImage", {
    imageId: S.String,
})
export const DeletedImage = taggedStruct("DeletedImage", {
    imageId: S.String,
})
export const DeleteImageFailed = taggedStruct("DeleteImageFailed", {
    error: S.String,
})

export const LoadedTags = taggedStruct("LoadedTags", {
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
})
export const FailedLoadingTags = taggedStruct("FailedLoadingTags", {
    error: S.String,
})

export const ToggledTagPicker = taggedStruct("ToggledTagPicker")
export const NewTagNameChanged = taggedStruct("NewTagNameChanged", {
    value: S.String,
})
// the add form: the name may or may not already be a tag, so the update
// decides between linking an existing tag and creating one first
export const SubmittedNewTag = taggedStruct("SubmittedNewTag")
export const ClickedAddTag = taggedStruct("ClickedAddTag", {
    tagId: S.String,
})
export const ClickedRemoveTag = taggedStruct("ClickedRemoveTag", {
    tagId: S.String,
})
export const ChangedImageTags = taggedStruct("ChangedImageTags", {
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
})
export const ImageTagsChangeFailed = taggedStruct("ImageTagsChangeFailed", {
    error: S.String,
})

export const CompletedLayoutMasonry = taggedStruct("CompletedLayoutMasonry")

export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})

export const ReorderedImages = taggedStruct("ReorderedImages")
export const ReorderImagesFailed = taggedStruct("ReorderImagesFailed", {
    error: S.String,
})

export const GotSidebarTooltipMessage = taggedStruct(
    "GotSidebarTooltipMessage",
    {
        tooltipId: S.String,
        message: SidebarTooltipMessageSchema,
    }
)

export const ToggledAppSidebarIsCollapsed = taggedStruct(
    "ToggledAppSidebarIsCollapsed"
)
export const ToggledAppSidebarMobileIsOpen = taggedStruct(
    "ToggledAppSidebarMobileIsOpen"
)
export const GotVideoYouTubeMessage = taggedStruct("GotVideoYouTubeMessage", {
    message: YouTubeEmbed.Message,
})
export const ToggledVideoEditing = taggedStruct("ToggledVideoEditing")
export const ToggledVideoTheatreMode = taggedStruct("ToggledVideoTheatreMode")
export const OpenedVideoEditor = taggedStruct("OpenedVideoEditor", {
    videoId: S.String,
})
export const ClosedVideoEditor = taggedStruct("ClosedVideoEditor")
export const EditingVideoTitleChanged = taggedStruct(
    "EditingVideoTitleChanged",
    {
        value: S.String,
    }
)
export const EditingVideoUrlChanged = taggedStruct("EditingVideoUrlChanged", {
    value: S.String,
})
export const ClickedSaveVideoEdits = taggedStruct("ClickedSaveVideoEdits")
export const UpdatedVideo = taggedStruct("UpdatedVideo", { video: Video })
export const ClickedMoveVideo = taggedStruct("ClickedMoveVideo", {
    videoId: S.String,
    direction: S.Literals(["earlier", "later"]),
})
export const ReorderedVideos = taggedStruct("ReorderedVideos")
export const ReorderVideosFailed = taggedStruct("ReorderVideosFailed", {
    error: S.String,
})
export const ChangedNewVideoTitle = taggedStruct("ChangedNewVideoTitle", {
    value: S.String,
})
export const ChangedNewVideoUrl = taggedStruct("ChangedNewVideoUrl", {
    value: S.String,
})
export const SubmittedNewVideo = taggedStruct("SubmittedNewVideo")
export const CreatedVideo = taggedStruct("CreatedVideo", { video: Video })
export const ClickedDeleteVideo = taggedStruct("ClickedDeleteVideo", {
    videoId: S.String,
})
export const DeletedVideo = taggedStruct("DeletedVideo", { videoId: S.String })
export const VideoChangeFailed = taggedStruct("VideoChangeFailed", {
    error: S.String,
})

export const Message = S.Union([
    ClickedLink,
    ChangedUrl,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    LoadedImages,
    LoadedMedia,
    FailedLoadingImages,
    SearchQueryChanged,
    CategoryFilterChanged,
    ChangedViewMode,
    ToggledUploadPanel,
    ToggledGalleryEditing,
    ClickedMoveImage,
    SelectedGalleryImage,
    ClosedGalleryImage,
    GotUploadDropMessage,
    RemovedSelectedUploadFile,
    ClickedUploadImages,
    RequestedUploadImages,
    UploadedImages,
    UploadImagesFailed,
    ResolvedImageUrls,
    OpenedImageEditor,
    ClosedImageEditor,
    EditingAltChanged,
    EditingTextChanged,
    EditingCategoryChanged,
    ClickedSaveImageEdits,
    SavedImageEdits,
    ImageEditsSaveFailed,
    RequestedDeleteImage,
    CancelledDeleteImage,
    ConfirmedDeleteImage,
    ClickedDeleteImage,
    DeletedImage,
    DeleteImageFailed,
    LoadedTags,
    FailedLoadingTags,
    ToggledTagPicker,
    NewTagNameChanged,
    SubmittedNewTag,
    ClickedAddTag,
    ClickedRemoveTag,
    ChangedImageTags,
    ImageTagsChangeFailed,
    CompletedLayoutMasonry,
    GotDragAndDropMessage,
    ReorderedImages,
    ReorderImagesFailed,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
    GotVideoYouTubeMessage,
    ToggledVideoEditing,
    ToggledVideoTheatreMode,
    OpenedVideoEditor,
    ClosedVideoEditor,
    EditingVideoTitleChanged,
    EditingVideoUrlChanged,
    ClickedSaveVideoEdits,
    UpdatedVideo,
    ClickedMoveVideo,
    ReorderedVideos,
    ReorderVideosFailed,
    ChangedNewVideoTitle,
    ChangedNewVideoUrl,
    SubmittedNewVideo,
    CreatedVideo,
    ClickedDeleteVideo,
    DeletedVideo,
    VideoChangeFailed,
])

export type Message = typeof Message.Type
