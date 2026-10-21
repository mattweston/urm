import { Subscription } from "foldkit"
import * as YouTubeEmbed from "../labs/media/youtube-embed/submodel.ts"
import { subscriptions as gallerySubscriptions } from "./gallery/gallery.subscription.ts"
import {
    GotDragAndDropMessage,
    GotVideoYouTubeMessage,
    Message,
} from "./platform/app.message.ts"
import { Model } from "./platform/app.model.ts"

export { Model } from "./platform/app.model.ts"
export type { Model as ModelType } from "./platform/app.model.ts"
export { Message } from "./platform/app.message.ts"
export type { Message as MessageType } from "./platform/app.message.ts"
export {
    ChangedImageTags,
    ClickedMoveVideo,
    ClickedSaveVideoEdits,
    ClickedMoveImage,
    ClosedVideoEditor,
    ClosedImageEditor,
    ClosedGalleryImage,
    ChangedNewVideoTitle,
    ChangedNewVideoUrl,
    CreatedVideo,
    ClickedAddTag,
    ClickedSaveImageEdits,
    DeleteImageFailed,
    DeletedImage,
    DeletedVideo,
    FailedLoadingImages,
    FailedLoadingTags,
    EditingVideoTitleChanged,
    EditingVideoUrlChanged,
    GotDragAndDropMessage,
    ImageEditsSaveFailed,
    ImageTagsChangeFailed,
    LoadedMedia,
    OpenedVideoEditor,
    ReorderImagesFailed,
    ReorderedImages,
    ReorderedVideos,
    ReorderVideosFailed,
    RequestedUploadImages,
    ResolvedImageUrls,
    SavedImageEdits,
    SelectedGalleryImage,
    SubmittedNewVideo,
    ToggledGalleryEditing,
    ToggledVideoEditing,
    UpdatedVideo,
    UploadImagesFailed,
    UploadedImages,
    VideoChangeFailed,
} from "./platform/app.message.ts"
export { Image } from "@urm/domain/schemas/media"
export type { Image as ImageType } from "@urm/domain/schemas/media"
export { Video } from "./video/video.ts"
export type { Video as VideoType } from "./video/video.ts"
export { ChangedUrl } from "./platform/route.message.ts"
export { CompletedNavigateInternal } from "./platform/route.message.ts"
export {
    galleryHref,
    isAppScope,
    libraryHref,
    videoDetailHref,
    videoHref,
} from "./platform/route.ts"
export { init, update } from "./platform/app.update.ts"
export {
    routedSubmodelView as routedView,
    submodelView as view,
    type MediaViewHrefs,
} from "./platform/app.view.ts"

const mediaGallerySubscriptions = Subscription.lift(gallerySubscriptions)<
    Model,
    Message
>({
    toChildModel: (model) => model,
    toParentMessage: ({ message }) => GotDragAndDropMessage({ message }),
})

const mediaYouTubeSubscriptions = YouTubeEmbed.subscriptions<Model, Message>({
    toChildModel: (model) => model.youtubePlayer,
    toParentMessage: (message) => GotVideoYouTubeMessage({ message }),
})

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
}) => {
    const { dragPointer, dragEscape, dragKeyboard, autoScroll } =
        Subscription.lift(mediaGallerySubscriptions)<
            ParentModel,
            ParentMessage
        >(config)
    const { labsMediaYouTubeEmbedPlayer } = Subscription.lift(
        mediaYouTubeSubscriptions
    )<ParentModel, ParentMessage>(config)

    return {
        mediaGalleryDragPointer: dragPointer,
        mediaGalleryDragEscape: dragEscape,
        mediaGalleryDragKeyboard: dragKeyboard,
        mediaGalleryAutoScroll: autoScroll,
        mediaVideoYouTubePlayer: labsMediaYouTubeEmbedPlayer,
    }
}
