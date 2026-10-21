import { Effect, Match as M, Option, String, Schema as S } from "effect"
import { Command, File } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./app.message.ts"
import {
    ChangedImageTags,
    DeleteImageFailed,
    DeletedImage,
    DeletedVideo,
    FailedLoadingImages,
    FailedLoadingTags,
    GotDragAndDropMessage,
    GotVideoYouTubeMessage,
    GotUploadDropMessage,
    GotSidebarTooltipMessage,
    ImageEditsSaveFailed,
    ImageTagsChangeFailed,
    LoadedImages,
    LoadedTags,
    ReorderImagesFailed,
    ReorderVideosFailed,
    ReorderedImages,
    ReorderedVideos,
    SavedImageEdits,
    UploadImagesFailed,
    UploadedImages,
    VideoChangeFailed,
    CreatedVideo,
    UpdatedVideo,
} from "./app.message.ts"
import {
    entityTagsApi,
    imagesApi,
    IMAGE_ENTITY_TYPE,
    tagsApi,
} from "./app.rpc.ts"
import { loadExternal, navigateInternal } from "./route.command.ts"
import { isAppScope, urlToAppRoute } from "./route.ts"
import { toString as urlToString } from "foldkit/url"
import {
    getSidebarTooltipsState,
    resetSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./sidebar.tooltips.state.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"
import { Model } from "./app.model.ts"
import { findTagByName, imageTagIds } from "./app.tags.ts"
import { DEFAULT_TAG_COLOR } from "../../tags/platform/app.model.ts"
import { Image } from "@urm/domain/schemas/media"
import * as YouTubeEmbed from "../../labs/media/youtube-embed/submodel.ts"
import { video_for_slug, type Video } from "../video/video.ts"
import type { AppRoute } from "./route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const CreateVideoArgs = S.Struct({
    slug: S.String,
    title: S.String,
    embed_url: S.String,
    thumbnail_src: S.String,
    youtube_id: S.String,
    order_position: S.Number,
})
const DeleteVideoArgs = S.Struct({ videoId: S.String })
const UpdateVideoArgs = S.Struct({
    videoId: S.String,
    slug: S.String,
    title: S.String,
    embed_url: S.String,
    thumbnail_src: S.String,
    youtube_id: S.String,
})
const VideoPosition = S.Struct({
    videoId: S.String,
    order_position: S.Number,
})
const ReorderVideosArgs = S.Struct({
    positions: S.Array(VideoPosition),
})

const CreateVideo = Command.define("CreateVideo", {
    args: CreateVideoArgs.fields,
    messages: [CreatedVideo, VideoChangeFailed],
    execute: () =>
        Effect.succeed(
            VideoChangeFailed({ error: "Video persistence is unavailable" })
        ),
})

const DeleteVideo = Command.define("DeleteVideo", {
    args: DeleteVideoArgs.fields,
    messages: [DeletedVideo, VideoChangeFailed],
    execute: () =>
        Effect.succeed(
            VideoChangeFailed({ error: "Video persistence is unavailable" })
        ),
})

const UpdateVideo = Command.define("UpdateVideo", {
    args: UpdateVideoArgs.fields,
    messages: [UpdatedVideo, VideoChangeFailed],
    execute: () =>
        Effect.succeed(
            VideoChangeFailed({ error: "Video persistence is unavailable" })
        ),
})

const ReorderVideos = Command.define("ReorderVideos", {
    args: ReorderVideosArgs.fields,
    messages: [ReorderedVideos, ReorderVideosFailed],
    execute: () =>
        Effect.succeed(
            ReorderVideosFailed({
                error: "Video persistence is unavailable",
            })
        ),
})

const youtube_id_from_url = (value: string): string | undefined => {
    try {
        const url = new URL(value)

        if (url.hostname === "youtu.be") {
            return url.pathname.split("/").filter(Boolean)[0]
        }

        if (
            url.hostname === "youtube.com" ||
            url.hostname === "www.youtube.com"
        ) {
            return (
                url.searchParams.get("v") ??
                url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
            )
        }
    } catch {
        return undefined
    }

    return undefined
}

const video_slug = (title: string): string =>
    title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const youtube_player_for_video = (
    video: Video | undefined
): YouTubeEmbed.ModelType =>
    YouTubeEmbed.initVideo({
        id: video?.youtube_id ?? "",
        title: video?.title ?? "Video",
        thumbnailUrl: video?.thumbnail_src ?? "",
    })

const youtube_player_for_route = (
    route: AppRoute,
    videos: ReadonlyArray<Video>
): YouTubeEmbed.ModelType =>
    M.value(route).pipe(
        M.withReturnType<YouTubeEmbed.ModelType>(),
        M.tagsExhaustive({
            Video: ({ slug }) =>
                youtube_player_for_video(video_for_slug(videos, slug)),
            Library: () => youtube_player_for_video(videos[0]),
            Gallery: () => youtube_player_for_video(videos[0]),
            NotFound: () => youtube_player_for_video(videos[0]),
        })
    )

const map_youtube_commands = (
    commands: ReadonlyArray<Command.Command<YouTubeEmbed.MessageType>>
): ReadonlyArray<Command.Command<Message>> =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotVideoYouTubeMessage({ message }))
        )
    )

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Ui.Tooltip.Message>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) =>
                GotSidebarTooltipMessage({ tooltipId: key, message })
            )
        )
    )

const delegateSidebarTooltip = (
    model: Model,
    key: string,
    message: Ui.Tooltip.Message
): UpdateReturn => {
    const sidebarTooltips = getSidebarTooltipsState()

    const maybeTooltip =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? sidebarTooltips.toggle
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? sidebarTooltips.home
              : sidebarTooltips.navItems[key]

    if (maybeTooltip === undefined) {
        return [model, []]
    }

    const { model: nextTooltip, commands = [] } = Ui.Tooltip.update(
        maybeTooltip,
        message
    )

    const nextSidebarTooltips =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? {
                  ...sidebarTooltips,
                  toggle: nextTooltip,
              }
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? {
                    ...sidebarTooltips,
                    home: nextTooltip,
                }
              : {
                    ...sidebarTooltips,
                    navItems: {
                        ...sidebarTooltips.navItems,
                        [key]: nextTooltip,
                    },
                }

    setSidebarTooltipsState(nextSidebarTooltips)

    return [
        {
            ...model,
            sidebarTooltipsRevision: model.sidebarTooltipsRevision + 1,
        },
        mapSidebarTooltipCommands(key, commands),
    ]
}
const UploadImages = Command.define("UploadImages", {
    args: {
        files: S.Array(File.File),
        images: S.Array(Image),
        // the category is absent until one is chosen
        category: S.NullOr(S.String),
    },
    messages: [UploadedImages, UploadImagesFailed],
    execute: () =>
        Effect.succeed(
            UploadImagesFailed({
                error: "Image uploads require the authenticated application host.",
            })
        ),
})
const ReorderImages = Command.define("ReorderImages", {
    args: { images: S.Array(Image) },
    messages: [ReorderedImages, ReorderImagesFailed],
    execute: ({ images }) =>
        Effect.tryPromise(() => {
            const updatedAt = Date.now()

            return Promise.all(
                images.map((image, index) =>
                    imagesApi.update({
                        id: image.id,
                        data: {
                            order_position: index,
                            updated_at: updatedAt,
                        },
                    })
                )
            )
        }).pipe(
            Effect.map(() => ReorderedImages()),
            Effect.catch((error) =>
                Effect.succeed(
                    ReorderImagesFailed({
                        error: toErrorMessage(error),
                    })
                )
            )
        ),
})
const SaveImageEdits = Command.define("SaveImageEdits", {
    args: { model: Model },
    messages: [SavedImageEdits, ImageEditsSaveFailed],
    execute: ({ model }) =>
        Effect.tryPromise(() => saveImageEdits(model)).pipe(
            Effect.map((image) => SavedImageEdits({ image })),
            Effect.catch((error) =>
                Effect.succeed(
                    ImageEditsSaveFailed({
                        error: toErrorMessage(error),
                    })
                )
            )
        ),
})
const DeleteImage = Command.define("DeleteImage", {
    args: { imageId: S.String },
    messages: [DeletedImage, DeleteImageFailed],
    execute: ({ imageId }) =>
        Effect.tryPromise(() => imagesApi.delete({ id: imageId })).pipe(
            Effect.map(() => DeletedImage({ imageId })),
            Effect.catch((error) =>
                Effect.succeed(
                    DeleteImageFailed({ error: toErrorMessage(error) })
                )
            )
        ),
})

const createTagId = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `tag-${Date.now()}-${Math.random().toString(36).slice(2)}`

// deterministic, so adding a tag twice overwrites one row instead of fanning
// out into duplicates
const entityTagId = (imageId: string, tagId: string): string =>
    `${IMAGE_ENTITY_TYPE}/${imageId}/${tagId}`

const loadTagState = async () => {
    const [tags, entityTags] = await Promise.all([
        tagsApi.list(),
        entityTagsApi.list({ entity_type: IMAGE_ENTITY_TYPE }),
    ])

    return { tags, entityTags }
}

const linkTag = async (imageId: string, tagId: string) => {
    await entityTagsApi.create({
        id: entityTagId(imageId, tagId),
        entity_type: IMAGE_ENTITY_TYPE,
        entity_id: imageId,
        tag_id: tagId,
        updated_at: Date.now(),
    })

    return loadTagState()
}

const LoadTags = Command.define("LoadTags", {
    messages: [LoadedTags, FailedLoadingTags],
    execute: Effect.tryPromise(() => loadTagState()).pipe(
        Effect.map(({ tags, entityTags }) => LoadedTags({ tags, entityTags })),
        Effect.catch((error) =>
            Effect.succeed(FailedLoadingTags({ error: toErrorMessage(error) }))
        )
    ),
})

const AddImageTag = Command.define("AddImageTag", {
    args: { imageId: S.String, tagId: S.String },
    messages: [ChangedImageTags, ImageTagsChangeFailed],
    execute: ({ imageId, tagId }) =>
        Effect.tryPromise(() => linkTag(imageId, tagId)).pipe(
            Effect.map(({ tags, entityTags }) =>
                ChangedImageTags({ tags, entityTags })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    ImageTagsChangeFailed({ error: toErrorMessage(error) })
                )
            )
        ),
})

const CreateAndAddImageTag = Command.define("CreateAndAddImageTag", {
    args: { imageId: S.String, tagName: S.String },
    messages: [ChangedImageTags, ImageTagsChangeFailed],
    execute: ({ imageId, tagName }) =>
        Effect.tryPromise(async () => {
            const { item } = await tagsApi.create({
                id: createTagId(),
                name: tagName,
                color: DEFAULT_TAG_COLOR,
                updated_at: Date.now(),
            })

            return linkTag(imageId, item.id)
        }).pipe(
            Effect.map(({ tags, entityTags }) =>
                ChangedImageTags({ tags, entityTags })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    ImageTagsChangeFailed({ error: toErrorMessage(error) })
                )
            )
        ),
})

const RemoveImageTag = Command.define("RemoveImageTag", {
    args: { linkId: S.String },
    messages: [ChangedImageTags, ImageTagsChangeFailed],
    execute: ({ linkId }) =>
        Effect.tryPromise(async () => {
            await entityTagsApi.delete({ id: linkId })

            return loadTagState()
        }).pipe(
            Effect.map(({ tags, entityTags }) =>
                ChangedImageTags({ tags, entityTags })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    ImageTagsChangeFailed({ error: toErrorMessage(error) })
                )
            )
        ),
})

const toErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : globalThis.String(error)

const uploadImages = (
    files: ReadonlyArray<File.File>,
    images: ReadonlyArray<Image>,
    category: string | null
): Command.Command<Message> => UploadImages({ files, images, category })

const reorderImages = (
    images: ReadonlyArray<Image>,
    itemId: string,
    toIndex: number
): ReadonlyArray<Image> => {
    const fromIndex = images.findIndex((image) => image.id === itemId)

    if (fromIndex === -1) {
        return images
    }

    const items = [...images]
    const [moved] = items.splice(fromIndex, 1)

    if (moved === undefined) {
        return images
    }

    const clampedIndex = Math.min(Math.max(toIndex, 0), items.length)
    items.splice(clampedIndex, 0, moved)

    return items
}

const imagesByOrder = (images: ReadonlyArray<Image>): ReadonlyArray<Image> =>
    [...images].sort((left, right) => {
        if (left.order_position !== right.order_position) {
            return left.order_position - right.order_position
        }

        return left.updated_at - right.updated_at
    })

const moveImage = (
    images: ReadonlyArray<Image>,
    imageId: string,
    direction: "earlier" | "later"
): ReadonlyArray<Image> => {
    const ordered_images = imagesByOrder(images)
    const current_index = ordered_images.findIndex(
        (image) => image.id === imageId
    )
    const target_index =
        direction === "earlier" ? current_index - 1 : current_index + 1

    if (
        current_index === -1 ||
        target_index < 0 ||
        target_index >= ordered_images.length
    ) {
        return images
    }

    return reorderImages(ordered_images, imageId, target_index).map(
        (image, index) => ({
            ...image,
            order_position: index,
            updated_at: Date.now(),
        })
    )
}

const persistReorder = (
    images: ReadonlyArray<Image>
): ReadonlyArray<Command.Command<Message>> => [ReorderImages({ images })]

const videosByOrder = (videos: ReadonlyArray<Video>): ReadonlyArray<Video> =>
    [...videos].sort((left, right) => {
        if (left.order_position !== right.order_position) {
            return left.order_position - right.order_position
        }

        return left.updated_at - right.updated_at
    })

const reorderVideos = (
    videos: ReadonlyArray<Video>,
    video_id: string,
    to_index: number
): ReadonlyArray<Video> => {
    const from_index = videos.findIndex((video) => video.id === video_id)

    if (from_index === -1) {
        return videos
    }

    const items = [...videos]
    const [moved] = items.splice(from_index, 1)

    if (moved === undefined) {
        return videos
    }

    const clamped_index = Math.min(Math.max(to_index, 0), items.length)
    items.splice(clamped_index, 0, moved)

    return items.map((video, index) => ({
        ...video,
        order_position: index,
        updated_at: Date.now(),
    }))
}

const moveVideo = (
    videos: ReadonlyArray<Video>,
    video_id: string,
    direction: "earlier" | "later"
): ReadonlyArray<Video> => {
    const ordered_videos = videosByOrder(videos)
    const current_index = ordered_videos.findIndex(
        (video) => video.id === video_id
    )
    const target_index =
        direction === "earlier" ? current_index - 1 : current_index + 1

    if (
        current_index === -1 ||
        target_index < 0 ||
        target_index >= ordered_videos.length
    ) {
        return videos
    }

    return reorderVideos(ordered_videos, video_id, target_index)
}

const persistVideoReorder = (
    videos: ReadonlyArray<Video>
): ReadonlyArray<Command.Command<Message>> => [
    ReorderVideos({
        positions: videos.map((video) => ({
            videoId: video.id,
            order_position: video.order_position,
        })),
    }),
]

const saveImageEdits = async (model: Model): Promise<Image> => {
    if (model.editingImageId === null) {
        throw new Error("No image selected")
    }

    const current = model.images.find(
        (image) => image.id === model.editingImageId
    )
    if (current === undefined) {
        throw new Error("Selected image no longer exists")
    }

    await imagesApi.update({
        id: current.id,
        data: {
            url: current.url,
            alt: model.editingAlt,
            text: model.editingText,
            ...(String.isEmpty(String.trim(model.editingCategory))
                ? {}
                : { category: model.editingCategory }),
            order_position: current.order_position,
            updated_at: Date.now(),
        },
    })

    return {
        ...current,
        alt: model.editingAlt,
        text: model.editingText,
        ...(String.isEmpty(String.trim(model.editingCategory))
            ? {}
            : { category: model.editingCategory }),
        updated_at: Date.now(),
    }
}

export const init = (pathname: string): UpdateReturn => {
    resetSidebarTooltipsState()
    const route = urlToAppRoute(pathname)

    return [
        {
            route,
            loading: true,
            error: null,
            images: [],
            searchQuery: "",
            categoryFilter: "all",
            viewMode: "grid",
            uploadDrop: Ui.FileDrop.init({ id: "media-upload-drop" }),
            selectedUploadFiles: [],
            uploadPanelOpen: false,
            uploadBusy: false,
            gallery_editing: false,
            selected_gallery_image_id: null,
            editingImageId: null,
            editingAlt: "",
            editingText: "",
            editingCategory: "",
            deleteConfirmId: null,
            tags: [],
            entityTags: [],
            videos: [],
            videos_editing: false,
            video_theatre_mode: false,
            editing_video_id: null,
            editing_video_title: "",
            editing_video_url: "",
            newVideoTitle: "",
            newVideoUrl: "",
            videosBusy: false,
            tagsError: null,
            tagsBusy: false,
            tagPickerOpen: false,
            newTagName: "",
            dragAndDrop: Ui.DragAndDrop.init({ id: "media-gallery" }),
            isSidebarCollapsed: false,
            isSidebarMobileOpen: false,
            sidebarTooltipsRevision: 0,
            youtubePlayer: youtube_player_for_route(route, []),
        },
        [LoadImages(), LoadTags()],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            LoadedImages: ({ images }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => null,
                    images: () =>
                        [...images].sort(
                            (left, right) => right.updated_at - left.updated_at
                        ),
                }),
                [],
            ],

            LoadedMedia: ({ images, tags, entityTags, videos }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => null,
                    images: () =>
                        [...images].sort(
                            (left, right) => right.updated_at - left.updated_at
                        ),
                    tags: () => tags,
                    entityTags: () => entityTags,
                    videos: () => videos,
                    tagsError: () => null,
                    tagsBusy: () => false,
                    youtubePlayer: () =>
                        youtube_player_for_route(model.route, videos),
                }),
                [],
            ],

            FailedLoadingImages: ({ error }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => error,
                }),
                [],
            ],

            SearchQueryChanged: ({ value }) => [
                modifyFields(model, { searchQuery: () => value }),
                [],
            ],

            CategoryFilterChanged: ({ value }) => [
                modifyFields(model, { categoryFilter: () => value }),
                [],
            ],

            ChangedViewMode: ({ mode }) => [
                modifyFields(model, { viewMode: () => mode }),
                [],
            ],

            ToggledUploadPanel: () => [
                modifyFields(model, {
                    uploadPanelOpen: (current) => !current,
                }),
                [],
            ],

            ToggledGalleryEditing: () => [
                modifyFields(model, {
                    gallery_editing: (current) => !current,
                    selected_gallery_image_id: () => null,
                    uploadPanelOpen: () => false,
                    editingImageId: () => null,
                    editingAlt: () => "",
                    editingText: () => "",
                    editingCategory: () => "",
                    tagPickerOpen: () => false,
                    newTagName: () => "",
                }),
                [],
            ],

            ClickedMoveImage: ({ imageId, direction }) => {
                if (!model.gallery_editing) {
                    return [model, []]
                }

                const next_images = moveImage(model.images, imageId, direction)

                if (next_images === model.images) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        images: () => next_images,
                        error: () => null,
                    }),
                    persistReorder(next_images),
                ]
            },

            SelectedGalleryImage: ({ imageId }) => {
                if (
                    model.gallery_editing ||
                    !model.images.some((image) => image.id === imageId)
                ) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        selected_gallery_image_id: () => imageId,
                        editingImageId: () => null,
                        editingAlt: () => "",
                        editingText: () => "",
                        editingCategory: () => "",
                        tagPickerOpen: () => false,
                        newTagName: () => "",
                    }),
                    [],
                ]
            },

            ClosedGalleryImage: () => [
                modifyFields(model, {
                    selected_gallery_image_id: () => null,
                }),
                [],
            ],

            GotUploadDropMessage: ({ message: dropMessage }) => {
                const {
                    model: nextDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.uploadDrop, dropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextFiles = Option.match(maybeOutMessage, {
                    onNone: () => model.selectedUploadFiles,
                    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) => [
                                ...model.selectedUploadFiles,
                                ...files,
                            ],
                            RejectedNonFiles: () => model.selectedUploadFiles,
                        })
                    ),
                })

                return [
                    modifyFields(model, {
                        uploadDrop: () => nextDrop,
                        selectedUploadFiles: () => nextFiles,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((nextMessage) =>
                                GotUploadDropMessage({ message: nextMessage })
                            )
                        )
                    ),
                ]
            },

            RemovedSelectedUploadFile: ({ fileIndex }) => [
                modifyFields(model, {
                    selectedUploadFiles: () =>
                        model.selectedUploadFiles.filter(
                            (_, index) => index !== fileIndex
                        ),
                }),
                [],
            ],

            ClickedUploadImages: () => {
                if (
                    model.uploadBusy ||
                    model.selectedUploadFiles.length === 0
                ) {
                    return [model, []]
                }

                const category =
                    model.categoryFilter === "all" ? null : model.categoryFilter

                return [
                    modifyFields(model, {
                        uploadBusy: () => true,
                        error: () => null,
                    }),
                    [
                        uploadImages(
                            model.selectedUploadFiles,
                            model.images,
                            category
                        ),
                    ],
                ]
            },

            RequestedUploadImages: ({ files }) => {
                if (model.uploadBusy) return [model, []]

                return [
                    modifyFields(model, {
                        uploadBusy: () => true,
                        selectedUploadFiles: () => [...files],
                        error: () => null,
                    }),
                    [uploadImages(files, model.images, null)],
                ]
            },

            UploadedImages: ({ images }) => [
                modifyFields(model, {
                    uploadBusy: () => false,
                    uploadPanelOpen: () => false,
                    selectedUploadFiles: () => [],
                    images: () => {
                        const uploaded_ids = images.map((image) => image.id)

                        return [
                            ...model.images.filter(
                                (image) => !uploaded_ids.includes(image.id)
                            ),
                            ...images,
                        ]
                    },
                }),
                [LoadImages()],
            ],

            UploadImagesFailed: ({ error }) => [
                modifyFields(model, {
                    uploadBusy: () => false,
                    error: () => error,
                }),
                [],
            ],

            ResolvedImageUrls: ({ images }) => {
                const resolved = new Map(
                    images.map(({ stored_url, url }) => [stored_url, url])
                )

                return [
                    modifyFields(model, {
                        images: (current) =>
                            current.map((image) => ({
                                ...image,
                                stored_url: image.stored_url ?? image.url,
                                url:
                                    resolved.get(
                                        image.stored_url ?? image.url
                                    ) ?? image.url,
                            })),
                    }),
                    [],
                ]
            },

            OpenedImageEditor: ({ imageId }) => {
                const image = model.images.find((item) => item.id === imageId)

                if (image === undefined) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        selected_gallery_image_id: () => null,
                        editingImageId: () => imageId,
                        editingAlt: () => image.alt,
                        editingText: () => image.text,
                        editingCategory: () => image.category ?? "",
                        newTagName: () => "",
                        tagsError: () => null,
                    }),
                    [],
                ]
            },

            ClosedImageEditor: () => [
                modifyFields(model, {
                    editingImageId: () => null,
                    editingAlt: () => "",
                    editingText: () => "",
                    editingCategory: () => "",
                    newTagName: () => "",
                    tagsError: () => null,
                }),
                [],
            ],

            EditingAltChanged: ({ value }) => [
                modifyFields(model, { editingAlt: () => value }),
                [],
            ],

            EditingTextChanged: ({ value }) => [
                modifyFields(model, { editingText: () => value }),
                [],
            ],

            EditingCategoryChanged: ({ value }) => [
                modifyFields(model, { editingCategory: () => value }),
                [],
            ],

            ClickedSaveImageEdits: () => {
                if (model.editingImageId === null) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                    }),
                    [SaveImageEdits({ model })],
                ]
            },

            SavedImageEdits: ({ image }) => [
                modifyFields(model, {
                    editingImageId: () => null,
                    editingAlt: () => "",
                    editingText: () => "",
                    editingCategory: () => "",
                    images: () =>
                        model.images.map((current) =>
                            current.id === image.id ? image : current
                        ),
                }),
                [LoadImages()],
            ],

            ImageEditsSaveFailed: ({ error }) => [
                modifyFields(model, {
                    error: () => error,
                }),
                [],
            ],

            RequestedDeleteImage: ({ imageId }) => [
                modifyFields(model, { deleteConfirmId: () => imageId }),
                [],
            ],

            CancelledDeleteImage: () => [
                modifyFields(model, { deleteConfirmId: () => null }),
                [],
            ],

            ConfirmedDeleteImage: () => {
                if (model.deleteConfirmId === null) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                        deleteConfirmId: () => null,
                    }),
                    [DeleteImage({ imageId: model.deleteConfirmId })],
                ]
            },

            ClickedDeleteImage: ({ imageId }) => [
                modifyFields(model, {
                    error: () => null,
                }),
                [DeleteImage({ imageId })],
            ],

            DeletedImage: ({ imageId }) => [
                modifyFields(model, {
                    deleteConfirmId: (current) =>
                        current === imageId ? null : current,
                    editingImageId: (current) =>
                        current === imageId ? null : current,
                    selected_gallery_image_id: (current) =>
                        current === imageId ? null : current,
                    editingAlt: (current) =>
                        model.editingImageId === imageId ? "" : current,
                    editingText: (current) =>
                        model.editingImageId === imageId ? "" : current,
                    editingCategory: (current) =>
                        model.editingImageId === imageId ? "" : current,
                }),
                [LoadImages()],
            ],

            DeleteImageFailed: ({ error }) => [
                modifyFields(model, {
                    error: () => error,
                }),
                [],
            ],

            LoadedTags: ({ tags, entityTags }) => [
                modifyFields(model, {
                    tags: () => tags,
                    entityTags: () => entityTags,
                    tagsError: () => null,
                    tagsBusy: () => false,
                }),
                [],
            ],

            FailedLoadingTags: ({ error }) => [
                modifyFields(model, {
                    tagsError: () => error,
                    tagsBusy: () => false,
                }),
                [],
            ],

            ToggledTagPicker: () => [
                modifyFields(model, { tagPickerOpen: (current) => !current }),
                [],
            ],

            NewTagNameChanged: ({ value }) => [
                modifyFields(model, { newTagName: () => value }),
                [],
            ],

            SubmittedNewTag: () => {
                const imageId = model.editingImageId
                const name = String.trim(model.newTagName)

                if (
                    imageId === null ||
                    String.isEmpty(name) ||
                    model.tagsBusy
                ) {
                    return [model, []]
                }

                const existing = findTagByName(model, name)

                if (existing === undefined) {
                    return [
                        modifyFields(model, {
                            tagsBusy: () => true,
                            tagsError: () => null,
                        }),
                        [CreateAndAddImageTag({ imageId, tagName: name })],
                    ]
                }

                // typing the name of a tag the image already carries is a
                // no-op, not an error
                if (imageTagIds(model, imageId).includes(existing.id)) {
                    return [modifyFields(model, { newTagName: () => "" }), []]
                }

                return [
                    modifyFields(model, {
                        tagsBusy: () => true,
                        tagsError: () => null,
                    }),
                    [AddImageTag({ imageId, tagId: existing.id })],
                ]
            },

            ClickedAddTag: ({ tagId }) => {
                const imageId = model.editingImageId

                if (imageId === null || model.tagsBusy) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        tagsBusy: () => true,
                        tagsError: () => null,
                    }),
                    [AddImageTag({ imageId, tagId })],
                ]
            },

            ClickedRemoveTag: ({ tagId }) => {
                const imageId = model.editingImageId

                if (imageId === null || model.tagsBusy) {
                    return [model, []]
                }

                const link = model.entityTags.find(
                    (entityTag) =>
                        entityTag.entity_id === imageId &&
                        entityTag.tag_id === tagId
                )

                if (link === undefined) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        tagsBusy: () => true,
                        tagsError: () => null,
                    }),
                    [RemoveImageTag({ linkId: link.id })],
                ]
            },

            ChangedImageTags: ({ tags, entityTags }) => [
                modifyFields(model, {
                    tags: () => tags,
                    entityTags: () => entityTags,
                    tagsError: () => null,
                    tagsBusy: () => false,
                    newTagName: () => "",
                }),
                [],
            ],

            ImageTagsChangeFailed: ({ error }) => [
                modifyFields(model, {
                    tagsError: () => error,
                    tagsBusy: () => false,
                }),
                [],
            ],

            CompletedLayoutMasonry: () => [model, []],

            GotDragAndDropMessage: ({ message: dragMessage }) => {
                const {
                    model: nextDragAndDrop,
                    commands: dragCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DragAndDrop.update(model.dragAndDrop, dragMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = dragCommands.map(
                    Command.mapEffect(
                        Effect.map((nextMessage) =>
                            GotDragAndDropMessage({ message: nextMessage })
                        )
                    )
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        modifyFields(model, {
                            dragAndDrop: () => nextDragAndDrop,
                        }),
                        mappedCommands,
                    ],
                    onSome: (outMessage) =>
                        M.value(outMessage).pipe(
                            withUpdateReturn,
                            M.tagsExhaustive({
                                Reordered: ({ itemId, toIndex }) => {
                                    if (
                                        model.route._tag === "Video" &&
                                        model.videos_editing
                                    ) {
                                        const next_videos = reorderVideos(
                                            videosByOrder(model.videos),
                                            itemId,
                                            toIndex
                                        )

                                        return [
                                            modifyFields(model, {
                                                videos: () => next_videos,
                                                videosBusy: () => true,
                                                dragAndDrop: () =>
                                                    nextDragAndDrop,
                                            }),
                                            [
                                                ...mappedCommands,
                                                ...persistVideoReorder(
                                                    next_videos
                                                ),
                                            ],
                                        ]
                                    }

                                    const nextImages = reorderImages(
                                        imagesByOrder(model.images),
                                        itemId,
                                        toIndex
                                    ).map((image, index) => ({
                                        ...image,
                                        order_position: index,
                                        updated_at: Date.now(),
                                    }))

                                    return [
                                        modifyFields(model, {
                                            images: () => nextImages,
                                            dragAndDrop: () => nextDragAndDrop,
                                        }),
                                        [
                                            ...mappedCommands,
                                            ...persistReorder(nextImages),
                                        ],
                                    ]
                                },
                                Cancelled: () => [
                                    modifyFields(model, {
                                        dragAndDrop: () => nextDragAndDrop,
                                    }),
                                    mappedCommands,
                                ],
                            })
                        ),
                })
            },

            ReorderedImages: () => [model, []],

            ReorderImagesFailed: ({ error }) => [
                modifyFields(model, {
                    error: () => error,
                }),
                [],
            ],

            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url.pathname)

                return [
                    modifyFields(model, {
                        route: () => route,
                        youtubePlayer: () =>
                            youtube_player_for_route(route, model.videos),
                    }),
                    [],
                ]
            },

            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [model, [navigateInternal(url)]]
                            }

                            return [model, [loadExternal(urlToString(url))]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),

            CompletedNavigateInternal: () => [model, []],
            CompletedLoadExternal: () => [model, []],
            GotSidebarTooltipMessage: ({ tooltipId: key, message }) =>
                delegateSidebarTooltip(model, key, message),
            ToggledAppSidebarIsCollapsed: () => [
                {
                    ...model,
                    isSidebarCollapsed: !model.isSidebarCollapsed,
                },
                [],
            ],
            ToggledAppSidebarMobileIsOpen: () => [
                {
                    ...model,
                    isSidebarMobileOpen: !model.isSidebarMobileOpen,
                },
                [],
            ],
            GotVideoYouTubeMessage: ({ message: youtube_message }) => {
                const [youtube_player, commands] = YouTubeEmbed.update(
                    model.youtubePlayer,
                    youtube_message
                )

                return [
                    modifyFields(model, { youtubePlayer: () => youtube_player }),
                    map_youtube_commands(commands),
                ]
            },
            ToggledVideoTheatreMode: () => [
                modifyFields(model, { video_theatre_mode: (current) => !current }),
                [],
            ],
            ToggledVideoEditing: () => [
                modifyFields(model, {
                    videos_editing: (current) => !current,
                    editing_video_id: () => null,
                    editing_video_title: () => "",
                    editing_video_url: () => "",
                    newVideoTitle: () => "",
                    newVideoUrl: () => "",
                    dragAndDrop: () =>
                        Ui.DragAndDrop.init({ id: "media-gallery" }),
                    error: () => null,
                }),
                [],
            ],
            OpenedVideoEditor: ({ videoId }) => {
                if (!model.videos_editing) {
                    return [model, []]
                }

                const video = model.videos.find(
                    (current) => current.id === videoId
                )

                if (video === undefined) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        editing_video_id: () => video.id,
                        editing_video_title: () => video.title,
                        editing_video_url: () =>
                            video.youtube_id === undefined
                                ? video.embed_url
                                : `https://www.youtube.com/watch?v=${video.youtube_id}`,
                        error: () => null,
                    }),
                    [],
                ]
            },
            ClosedVideoEditor: () => [
                modifyFields(model, {
                    editing_video_id: () => null,
                    editing_video_title: () => "",
                    editing_video_url: () => "",
                    error: () => null,
                }),
                [],
            ],
            EditingVideoTitleChanged: ({ value }) => [
                model.videos_editing && model.editing_video_id !== null
                    ? modifyFields(model, { editing_video_title: () => value })
                    : model,
                [],
            ],
            EditingVideoUrlChanged: ({ value }) => [
                model.videos_editing && model.editing_video_id !== null
                    ? modifyFields(model, { editing_video_url: () => value })
                    : model,
                [],
            ],
            ClickedSaveVideoEdits: () => {
                if (!model.videos_editing || model.editing_video_id === null) {
                    return [model, []]
                }

                const video = model.videos.find(
                    (current) => current.id === model.editing_video_id
                )
                const title = model.editing_video_title.trim()
                const youtube_id = youtube_id_from_url(
                    model.editing_video_url.trim()
                )

                if (video === undefined) {
                    return [model, []]
                }

                if (title === "" || youtube_id === undefined) {
                    return [
                        modifyFields(model, {
                            error: () =>
                                "Enter a title and a valid YouTube video URL.",
                        }),
                        [],
                    ]
                }

                return [
                    modifyFields(model, {
                        videosBusy: () => true,
                        error: () => null,
                    }),
                    [
                        UpdateVideo({
                            videoId: video.id,
                            slug: video.slug,
                            title,
                            embed_url: `https://www.youtube.com/embed/${youtube_id}`,
                            thumbnail_src: `https://i.ytimg.com/vi/${youtube_id}/hqdefault.jpg`,
                            youtube_id,
                        }),
                    ],
                ]
            },
            UpdatedVideo: ({ video }) => {
                const videos = model.videos.map((current) =>
                    current.id === video.id ? video : current
                )

                return [
                    modifyFields(model, {
                        videos: () => videos,
                        editing_video_id: () => null,
                        editing_video_title: () => "",
                        editing_video_url: () => "",
                        videosBusy: () => false,
                        error: () => null,
                        youtubePlayer: () =>
                            youtube_player_for_route(model.route, videos),
                    }),
                    [],
                ]
            },
            ClickedMoveVideo: ({ videoId, direction }) => {
                if (!model.videos_editing || model.videosBusy) {
                    return [model, []]
                }

                const videos = moveVideo(model.videos, videoId, direction)

                if (videos === model.videos) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        videos: () => videos,
                        videosBusy: () => true,
                        error: () => null,
                    }),
                    persistVideoReorder(videos),
                ]
            },
            ReorderedVideos: () => [
                modifyFields(model, { videosBusy: () => false }),
                [],
            ],
            ReorderVideosFailed: ({ error }) => [
                modifyFields(model, {
                    videosBusy: () => false,
                    error: () => error,
                }),
                [],
            ],
            ChangedNewVideoTitle: ({ value }) => [
                model.videos_editing
                    ? modifyFields(model, { newVideoTitle: () => value })
                    : model,
                [],
            ],
            ChangedNewVideoUrl: ({ value }) => [
                model.videos_editing
                    ? modifyFields(model, { newVideoUrl: () => value })
                    : model,
                [],
            ],
            SubmittedNewVideo: () => {
                if (!model.videos_editing) {
                    return [model, []]
                }

                const title = model.newVideoTitle.trim()
                const youtube_id = youtube_id_from_url(model.newVideoUrl.trim())
                const slug = video_slug(title)

                if (title === "" || slug === "" || youtube_id === undefined) {
                    return [
                        modifyFields(model, {
                            error: () =>
                                "Enter a title and a valid YouTube video URL.",
                        }),
                        [],
                    ]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                        videosBusy: () => true,
                    }),
                    [
                        CreateVideo({
                            slug,
                            title,
                            embed_url: `https://www.youtube.com/embed/${youtube_id}`,
                            thumbnail_src: `https://i.ytimg.com/vi/${youtube_id}/hqdefault.jpg`,
                            youtube_id,
                            order_position: model.videos.length,
                        }),
                    ],
                ]
            },
            CreatedVideo: ({ video }) => [
                modifyFields(model, {
                    videos: (videos) =>
                        videos.some((item) => item.id === video.id)
                            ? videos
                            : [...videos, video],
                    newVideoTitle: () => "",
                    newVideoUrl: () => "",
                    videosBusy: () => false,
                    error: () => null,
                    youtubePlayer: () => youtube_player_for_video(video),
                }),
                [],
            ],
            ClickedDeleteVideo: ({ videoId }) =>
                model.videos_editing
                    ? [
                          modifyFields(model, {
                              videosBusy: () => true,
                              error: () => null,
                          }),
                          [DeleteVideo({ videoId })],
                      ]
                    : [model, []],
            DeletedVideo: ({ videoId }) => {
                const videos = model.videos.filter(
                    (video) => video.id !== videoId
                )

                return [
                    modifyFields(model, {
                        videos: () => videos,
                        videosBusy: () => false,
                        youtubePlayer: () =>
                            youtube_player_for_video(videos[0]),
                    }),
                    [],
                ]
            },
            VideoChangeFailed: ({ error }) => [
                modifyFields(model, {
                    videosBusy: () => false,
                    error: () => error,
                }),
                [],
            ],
        })
    )
const LoadImages = Command.define("LoadImages", {
    messages: [LoadedImages, FailedLoadingImages],
    execute: Effect.tryPromise(() => imagesApi.list()).pipe(
        Effect.map((images) => LoadedImages({ images })),
        Effect.catch((error) =>
            Effect.succeed(
                FailedLoadingImages({
                    error: toErrorMessage(error),
                })
            )
        )
    ),
})

export const initLoadImages = () => LoadImages()
