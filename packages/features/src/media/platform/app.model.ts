import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import { Image } from "@urm/domain/schemas/media"
import { EntityTag, Tag } from "@urm/domain/schemas/tags"
import * as YouTubeEmbed from "../../labs/media/youtube-embed/submodel.ts"
import { Video } from "../video/video.ts"
import { AppRoute } from "./route.ts"

export const ViewMode = S.Literals(["grid", "list"])
export type ViewMode = typeof ViewMode.Type

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    route: AppRoute,
    loading: S.Boolean,
    error: S.NullOr(S.String),
    images: S.Array(Image),
    searchQuery: S.String,
    categoryFilter: S.String,
    viewMode: ViewMode,
    uploadDrop: Ui.FileDrop.Model,
    selectedUploadFiles: S.Array(File.File),
    uploadPanelOpen: S.Boolean,
    uploadBusy: S.Boolean,
    gallery_editing: S.Boolean,
    selected_gallery_image_id: S.NullOr(S.String),
    editingImageId: S.NullOr(S.String),
    editingAlt: S.String,
    editingText: S.String,
    editingCategory: S.String,
    // set while the delete confirmation dialog is open, and holds the image
    // it would delete
    deleteConfirmId: S.NullOr(S.String),
    // every tag in the domain, and only the entity tags whose entity_type is
    // "images" -- the tag RPCs need a session, so an anonymous visitor browses
    // images with these empty and tagsError set
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
    videos: S.Array(Video),
    videos_editing: S.Boolean,
    video_theatre_mode: S.Boolean,
    editing_video_id: S.NullOr(S.String),
    editing_video_title: S.String,
    editing_video_url: S.String,
    newVideoTitle: S.String,
    newVideoUrl: S.String,
    videosBusy: S.Boolean,
    tagsError: S.NullOr(S.String),
    tagsBusy: S.Boolean,
    tagPickerOpen: S.Boolean,
    newTagName: S.String,
    dragAndDrop: Ui.DragAndDrop.Model,
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
    youtubePlayer: YouTubeEmbed.Model,
})

export type Model = typeof Model.Type
