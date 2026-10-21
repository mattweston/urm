import { Array, Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Navigation, Submodel } from "foldkit"
import type { Url } from "foldkit/url"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteData } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import * as Media from "@urm/features/media/submodel"
import { DEFAULT_TAG_COLOR } from "@urm/features/tags/submodel"
import {
    ChangeMedia,
    DomainMedia,
    MediaAction,
    MediaLibrary,
    LibrarySummary,
} from "@urm/contracts/media"
import { AccountRequestError, ContactsApi } from "../contacts/api.ts"

// The bounded library is one server-owned snapshot; UI projections are never stored.
const ui_schema = S.Struct(
    Struct.omit(Media.Model.fields, [
        "images",
        "tags",
        "entityTags",
        "videos",
        "can_write",
    ])
)
const ui_only = (model: Media.ModelType) =>
    Struct.omit(model, ["images", "tags", "entityTags", "videos", "can_write"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
})
export type Model = typeof Model.Type
const LibraryLoaded = taggedStruct("LibraryLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    result: S.NullOr(Media.Message),
})
const LibraryFailed = taggedStruct("LibraryFailed", {
    epoch: S.Number,
    error: S.String,
    upload: S.Boolean,
})
const Refreshed = taggedStruct("Refreshed")
export const Message = S.Union([
    Media.Message,
    LibraryLoaded,
    LibraryFailed,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
const CacheModel = S.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [MediaLibrary],
    queries: [DomainMedia],
    mutations: [ChangeMedia],
})
const library_query = (domain_id: string) =>
    Data.query(DomainMedia, { domain_id }, { select: LibrarySummary, first: 1 })
/**
 * Carries every `RemoteData` state into the UI model instead of reducing the
 * read to `Ready`-or-nothing, which rendered a failed library as an empty one
 * and dropped the value `Refreshing` and `Failed.previous` still hold.
 *
 * `Ready` with an empty page is a separate case from `NotFound`: the query asks
 * for one row, and a domain that has none is not a read that failed.
 */
export const project = (model: Model): Media.ModelType => {
    const result = library_query(model.domain_id).read({ remote: model.remote })
    const base = { ...model.ui, can_write: model.can_write && !model.pending }
    const none = { images: [], tags: [], entityTags: [], videos: [] } as const
    return RemoteData.render(result, {
        loading: (): Media.ModelType => ({
            ...base,
            ...none,
            loading: true,
            error: null,
        }),
        notFound: (): Media.ModelType => ({
            ...base,
            ...none,
            loading: false,
            error: null,
        }),
        failed: (error): Media.ModelType => ({
            ...base,
            ...none,
            loading: false,
            error: error.message,
        }),
        data: (page, freshness): Media.ModelType => {
            const data = page.items[0]
            const loading = freshness._tag === "Refreshing"
            const error =
                freshness._tag === "Stale" ? freshness.error.message : null
            return data === undefined
                ? { ...base, ...none, loading, error }
                : {
                      ...base,
                      loading,
                      error,
                      images: data.images,
                      tags: data.tags,
                      entityTags: data.entity_tags,
                      videos: data.videos.map(({ youtube_id, ...video }) => ({
                          ...video,
                          ...(youtube_id === null ? {} : { youtube_id }),
                      })),
                  }
        },
    })
}
export const init = (pathname: string): Model => ({
    ui: ui_only(Media.init(pathname)[0]),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...init("/media/library"),
    ui: { ...ui_only(Media.init("/media/library")[0]), route: model.ui.route },
    epoch: model.epoch + 1,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
}
const check_session = Effect.fn("Media.checkSession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === domain_id && (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Media access changed. Sign in or refresh.",
            })
        )
    return api
})
const read_library = (domain_id: string) =>
    Effect.gen(function* () {
        const api = yield* ContactsApi
        const loaded = yield* Data.prefetch(
            { remote: Remote.initial },
            library_query(domain_id)
        ).pipe(Effect.provide(api.remote(domain_id)))
        if (library_query(domain_id).read(loaded)._tag !== "Ready")
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 403,
                    message:
                        "Media could not be loaded. Check workspace access and refresh.",
                })
            )
        return loaded.remote
    })
const LoadMediaLibrary = Command.define("LoadMediaLibrary", {
    args: scope_fields,
    messages: [LibraryLoaded, LibraryFailed],
    execute: ({ account_id, domain_id, epoch }) =>
        Effect.gen(function* () {
            yield* check_session(account_id, domain_id, false)
            return LibraryLoaded({
                epoch,
                remote: yield* read_library(domain_id),
                result: null,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    LibraryFailed({
                        epoch,
                        error: error.message,
                        upload: false,
                    })
                )
            )
        ),
})
const ChangeMediaLibrary = Command.define("ChangeMediaLibrary", {
    args: { ...scope_fields, action: MediaAction, success: Media.Message },
    messages: [LibraryLoaded, LibraryFailed],
    execute: ({ account_id, domain_id, epoch, action, success }) =>
        Effect.gen(function* () {
            const api = yield* check_session(account_id, domain_id, true)
            yield* Remote.mutate(
                ChangeMedia,
                { domain_id, action },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(domain_id)))
            return LibraryLoaded({
                epoch,
                remote: yield* read_library(domain_id),
                result: success,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    LibraryFailed({
                        epoch,
                        error: "Media change could not be confirmed. Refresh before retrying.",
                        upload: false,
                    })
                )
            )
        ),
})
const image_dimensions = async (
    file: File.File
): Promise<Readonly<{ width?: number; height?: number }>> => {
    if (typeof globalThis.Image === "undefined") return {}
    const blob_url = URL.createObjectURL(file)

    try {
        return await new Promise((resolve) => {
            const image = new globalThis.Image()
            image.addEventListener("load", () =>
                resolve({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                })
            )
            image.addEventListener("error", () => resolve({}))
            image.src = blob_url
        })
    } finally {
        URL.revokeObjectURL(blob_url)
    }
}

const UploadMediaLibrary = Command.define("UploadMediaLibrary", {
    args: {
        ...scope_fields,
        files: S.Array(File.File),
        category: S.NullOr(S.String),
        count: S.Number,
    },
    messages: [LibraryLoaded, LibraryFailed],
    execute: ({ account_id, domain_id, epoch, files, category, count }) =>
        Effect.gen(function* () {
            const api = yield* check_session(account_id, domain_id, true)
            const uploaded_ids: string[] = []
            for (const [index, file] of files.entries()) {
                const url = yield* api.upload_image(domain_id, file, "Media")
                const id = url.split("/").at(-1) ?? crypto.randomUUID()
                const dimensions = yield* Effect.promise(() =>
                    image_dimensions(file)
                )
                const action: MediaAction = {
                    _tag: "create_image",
                    id,
                    url,
                    alt: file.name,
                    text: "",
                    category,
                    width: dimensions.width ?? null,
                    height: dimensions.height ?? null,
                    order_position: count + index,
                }
                yield* Remote.mutate(
                    ChangeMedia,
                    { domain_id, action },
                    id
                ).pipe(Effect.provide(api.remote(domain_id)))
                uploaded_ids.push(id)
            }
            const remote = yield* read_library(domain_id)
            const result = library_query(domain_id).read({ remote })
            return LibraryLoaded({
                epoch,
                remote,
                result: Media.UploadedImages({
                    images:
                        result._tag === "Ready"
                            ? (result.value.items[0]?.images.filter((image) =>
                                  uploaded_ids.includes(image.id)
                              ) ?? [])
                            : [],
                }),
            })
        }).pipe(
            Effect.catch((error) => {
                const message =
                    error instanceof AccountRequestError
                        ? error.message
                        : "Upload could not be confirmed. Refresh before retrying."
                return read_library(domain_id).pipe(
                    Effect.map((remote) =>
                        LibraryLoaded({
                            epoch,
                            remote,
                            result: Media.UploadImagesFailed({
                                error: message,
                            }),
                        })
                    ),
                    Effect.catch(() =>
                        Effect.succeed(
                            LibraryFailed({
                                epoch,
                                error: message,
                                upload: true,
                            })
                        )
                    )
                )
            })
        ),
})
const CreateMediaVideo = Command.define("CreateMediaVideo", {
    args: { ...scope_fields, action: S.Struct({ ...Media.Video.fields }) },
    messages: [LibraryLoaded, LibraryFailed],
    execute: ({ action, ...scope }) => {
        const video = { ...action, id: crypto.randomUUID() }
        return ChangeMediaLibrary({
            ...scope,
            action: {
                _tag: "create_video",
                ...video,
                youtube_id: video.youtube_id ?? null,
            },
            success: Media.CreatedVideo({ video }),
        }).effect
    },
})
const UploadImagesArgs = S.Struct({
    files: S.Array(File.File),
    images: S.Array(Media.Image),
    category: S.NullOr(S.String),
})
const ReorderImagesArgs = S.Struct({ images: S.Array(Media.Image) })
const ModelArgs = S.Struct({ model: Media.Model })
const ImageIdArgs = S.Struct({ imageId: S.String })
const ImageTagArgs = S.Struct({
    imageId: S.String,
    tagId: S.String,
})
const NewImageTagArgs = S.Struct({
    imageId: S.String,
    tagName: S.String,
})
const LinkIdArgs = S.Struct({ linkId: S.String })
const NavigateArgs = S.Struct({ href: S.String })
const CreateVideoArgs = S.Struct({
    slug: S.String,
    title: S.String,
    embed_url: S.String,
    thumbnail_src: S.String,
    youtube_id: S.String,
    order_position: S.Number,
})
const VideoIdArgs = S.Struct({ videoId: S.String })
const UpdateVideoArgs = S.Struct({
    videoId: S.String,
    slug: S.String,
    title: S.String,
    embed_url: S.String,
    thumbnail_src: S.String,
    youtube_id: S.String,
})
const ReorderVideosArgs = S.Struct({
    positions: S.Array(
        S.Struct({
            videoId: S.String,
            order_position: S.Number,
        })
    ),
})

const NavigateMedia = Command.define("NavigateMedia", {
    args: { href: S.String },
    messages: [Media.CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href.replace(/\/$/, "")).pipe(
            Effect.as(Media.CompletedNavigateInternal())
        ),
})
const translate = (
    model: Model,
    command: Command.Command<Media.MessageType>
): UpdateReturn[1] => {
    const scope = {
        account_id: model.account_id,
        domain_id: model.domain_id,
        epoch: model.epoch,
    }
    const change = (
        action: MediaAction,
        success: Media.MessageType
    ): UpdateReturn[1] => [ChangeMediaLibrary({ ...scope, action, success })]
    const args = command.args
    switch (command.name) {
        case "LoadImages":
        case "LoadTags":
            return []
        case "NavigateInternal":
            return S.is(NavigateArgs)(args) ? [NavigateMedia(args)] : []
        case "UploadImages":
            return S.is(UploadImagesArgs)(args)
                ? [
                      UploadMediaLibrary({
                          ...scope,
                          files: args.files,
                          category: args.category,
                          count: args.images.length,
                      }),
                  ]
                : []
        case "SaveImageEdits":
            return S.is(ModelArgs)(args) && args.model.editingImageId !== null
                ? change(
                      {
                          _tag: "update_image",
                          id: args.model.editingImageId,
                          alt: args.model.editingAlt,
                          text: args.model.editingText,
                          category: args.model.editingCategory.trim() || null,
                      },
                      Media.ClosedImageEditor()
                  )
                : []
        case "DeleteImage":
            return S.is(ImageIdArgs)(args)
                ? change(
                      { _tag: "delete_image", id: args.imageId },
                      Media.DeletedImage({ imageId: args.imageId })
                  )
                : []
        case "ReorderImages":
            return S.is(ReorderImagesArgs)(args)
                ? change(
                      {
                          _tag: "reorder_images",
                          positions: args.images.map(
                              (image, order_position) => ({
                                  id: image.id,
                                  order_position,
                              })
                          ),
                      },
                      Media.ReorderedImages()
                  )
                : []
        case "AddImageTag":
            return S.is(ImageTagArgs)(args)
                ? change(
                      {
                          _tag: "add_tag",
                          image_id: args.imageId,
                          tag_id: args.tagId,
                      },
                      Media.ChangedImageTags({ tags: [], entityTags: [] })
                  )
                : []
        case "CreateAndAddImageTag":
            return S.is(NewImageTagArgs)(args)
                ? change(
                      {
                          _tag: "create_tag",
                          image_id: args.imageId,
                          name: args.tagName.trim(),
                          color: DEFAULT_TAG_COLOR,
                      },
                      Media.ChangedImageTags({ tags: [], entityTags: [] })
                  )
                : []
        case "RemoveImageTag":
            return S.is(LinkIdArgs)(args)
                ? change(
                      { _tag: "remove_tag", id: args.linkId },
                      Media.ChangedImageTags({ tags: [], entityTags: [] })
                  )
                : []
        case "CreateVideo":
            return S.is(CreateVideoArgs)(args)
                ? [
                      CreateMediaVideo({
                          ...scope,
                          action: { ...args, id: "", updated_at: 0 },
                      }),
                  ]
                : []
        case "UpdateVideo":
            return S.is(UpdateVideoArgs)(args)
                ? change(
                      {
                          _tag: "update_video",
                          id: args.videoId,
                          slug: args.slug,
                          title: args.title,
                          embed_url: args.embed_url,
                          thumbnail_src: args.thumbnail_src,
                          youtube_id: args.youtube_id,
                      },
                      Media.ClosedVideoEditor()
                  )
                : []
        case "DeleteVideo":
            return S.is(VideoIdArgs)(args)
                ? change(
                      { _tag: "delete_video", id: args.videoId },
                      Media.DeletedVideo({ videoId: args.videoId })
                  )
                : []
        case "ReorderVideos":
            return S.is(ReorderVideosArgs)(args)
                ? change(
                      {
                          _tag: "reorder_videos",
                          positions: args.positions.map(
                              ({ videoId, order_position }) => ({
                                  id: videoId,
                                  order_position,
                              })
                          ),
                      },
                      Media.ReorderedVideos()
                  )
                : []
        default:
            return [command]
    }
}
export const synchronize = (
    model: Model,
    scope: { account_id: string; domain_id: string; can_write: boolean } | null
): UpdateReturn => {
    if (scope === null || scope.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        scope.account_id === model.account_id &&
        scope.domain_id === model.domain_id &&
        scope.can_write === model.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...scope, pending: true }
    return [next, [LoadMediaLibrary({ ...scope, epoch: next.epoch })]]
}
export const result_message = (message: Message): Media.MessageType | null =>
    message._tag === "LibraryLoaded"
        ? message.result
        : message._tag === "LibraryFailed"
          ? message.upload
              ? Media.UploadImagesFailed({ error: message.error })
              : null
          : message._tag === "Refreshed"
            ? null
            : message
export const update = (
    model: Model,
    message: Message,
    _active_domain_id?: Option.Option<string>
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "LibraryLoaded") {
        const next = {
            ...model,
            remote: message.remote,
            pending: false,
            ui: {
                ...model.ui,
                loading: false,
                error: null,
                uploadBusy: false,
                tagsBusy: false,
                videosBusy: false,
            },
        }
        if (message.result === null) return [next, []]
        const [ui, commands] = Media.update(project(next), message.result)
        const completed = { ...next, ui: ui_only(ui) }
        return [
            completed,
            Array.flatMap(commands, (command) => translate(completed, command)),
        ]
    }
    if (message._tag === "LibraryFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    loading: false,
                    error: message.error,
                    uploadBusy: false,
                    tagsBusy: false,
                    videosBusy: false,
                },
            },
            [],
        ]
    if (message._tag === "Refreshed")
        return model.domain_id === "" || model.pending
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      LoadMediaLibrary({
                          account_id: model.account_id,
                          domain_id: model.domain_id,
                          epoch: model.epoch,
                      }),
                  ],
              ]
    // Only the account RPC adapter may supply server records.
    if (
        [
            "LoadedMedia",
            "LoadedImages",
            "LoadedTags",
            "ResolvedImageUrls",
            "UploadedImages",
            "SavedImageEdits",
            "CreatedVideo",
            "UpdatedVideo",
            "ChangedImageTags",
        ].includes(message._tag)
    )
        return [model, []]
    if (
        (model.pending || !model.can_write) &&
        [
            "ToggledUploadPanel",
            "ToggledGalleryEditing",
            "ClickedMoveImage",
            "GotUploadDropMessage",
            "ClickedUploadImages",
            "RequestedUploadImages",
            "OpenedImageEditor",
            "ClickedSaveImageEdits",
            "RequestedDeleteImage",
            "ConfirmedDeleteImage",
            "ClickedDeleteImage",
            "SubmittedNewTag",
            "ClickedAddTag",
            "ClickedRemoveTag",
            "GotDragAndDropMessage",
            "ToggledVideoEditing",
            "OpenedVideoEditor",
            "ClickedSaveVideoEdits",
            "ClickedMoveVideo",
            "SubmittedNewVideo",
            "ClickedDeleteVideo",
        ].includes(message._tag)
    )
        return [model, []]
    const [ui, commands] = Media.update(project(model), message)
    const next = { ...model, ui: ui_only(ui) }
    const translated = Array.flatMap(commands, (command) =>
        translate(next, command)
    )
    return [
        {
            ...next,
            pending:
                model.pending ||
                translated.some((command) =>
                    [
                        "ChangeMediaLibrary",
                        "UploadMediaLibrary",
                        "CreateMediaVideo",
                    ].includes(command.name)
                ),
        },
        translated,
    ]
}
export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    active_domain_id: Option.Option<string>
): UpdateReturn =>
    update(
        model,
        Media.ChangedUrl({ url: { ...url, pathname } }),
        active_domain_id
    )
export const hrefs: Media.MediaViewHrefs = {
    library_href: () => "/media/library",
    gallery_href: () => "/media/gallery",
    video_href: () => "/media/video",
    video_detail_href: (slug) => `/media/video/${slug}`,
    manage_videos: true,
    image_src: (url) => url,
}
export const view = Submodel.defineView<Model, Message, Media.MediaViewHrefs>(
    (model, view_inputs, h) =>
        h.div(
            [],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.Disabled(model.pending),
                        h.OnClick(Refreshed()),
                        h.Class("text-sm underline"),
                    ],
                    ["Refresh"]
                ),
                ...(!model.can_write ? [h.p([], ["Read-only access"])] : []),
                h.submodel({
                    slotId: "media-library",
                    model: project(model),
                    view: Media.routedView,
                    viewInputs: {
                        ...view_inputs,
                        manage_videos: model.can_write && !model.pending,
                    },
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (model: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
}) =>
    Media.subscriptions<ParentModel, ParentMessage>({
        toChildModel: (model) => project(config.toChildModel(model)),
        toParentMessage: config.toParentMessage,
    })
export const clicked_save_image_edits = Media.ClickedSaveImageEdits
export const toggled_gallery_editing = Media.ToggledGalleryEditing
export const toggled_video_editing = Media.ToggledVideoEditing
export const opened_video_editor = Media.OpenedVideoEditor
export const closed_video_editor = Media.ClosedVideoEditor
export const editing_video_title_changed = Media.EditingVideoTitleChanged
export const editing_video_url_changed = Media.EditingVideoUrlChanged
export const clicked_save_video_edits = Media.ClickedSaveVideoEdits
export const clicked_move_video = Media.ClickedMoveVideo
export const got_drag_and_drop_message = Media.GotDragAndDropMessage
export const clicked_move_image = Media.ClickedMoveImage
export const selected_gallery_image = Media.SelectedGalleryImage
export const closed_gallery_image = Media.ClosedGalleryImage
export const clicked_add_tag = Media.ClickedAddTag
export const requested_upload_images = Media.RequestedUploadImages
export const changed_new_video_title = Media.ChangedNewVideoTitle
export const changed_new_video_url = Media.ChangedNewVideoUrl
export const submitted_new_video = Media.SubmittedNewVideo
