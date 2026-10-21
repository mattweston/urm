import { Array, Match as M, Option, Record } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { FileDrop } from "@foldkit/ui"
import type { GalleryText } from "./images.ts"
import { getGalleryText, frames } from "./images.ts"
import type { Model } from "./gallery.model.ts"
import {
    ImagesNotLoaded,
    ImagesLoading,
    ImagesLoaded,
    ImagesFailed,
} from "./gallery.model.ts"
import type { Message } from "./gallery.message.ts"
import { GotFileDropMessage } from "./gallery.message.ts"
import {
    syncGalleryScene,
    retryGalleryImages,
    focusFrame,
    navigateGallery,
    replaceFrameImage,
    resetCameraToDefault,
    restoreFrameImage,
} from "./gallery.command.ts"
import {
    Gallery3dEditArtworkDetailsRoute,
    Gallery3dEditArtworkListRoute,
    Gallery3dEditIndexRoute,
    Gallery3dEditItemDetailsRoute,
    Gallery3dEditItemRoute,
    gallery3dEditHrefs,
    type Gallery3dEditHrefs,
} from "./gallery.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        route: Gallery3dEditIndexRoute(),
        imagesState: ImagesNotLoaded(),
        texture_states: {},
        scene_available: false,
        grid_view: false,
        editing: false,
        image_busy: false,
        image_settings: {},
        selectedFrameKey: Option.none(),
        maybeError: Option.none(),
        fileDrop: FileDrop.init({ id: "gallery-frame-image-drop" }),
        imageOverrides: {},
        textOverrides: {},
    },
    [],
]

export const update = (
    model: Model,
    message: Message,
    hrefs: Gallery3dEditHrefs = gallery3dEditHrefs
): UpdateReturn => {
    const [updated_model, commands] = updateMessage(model, message, hrefs)
    const states = Object.values(updated_model.texture_states)
    const next_model =
        updated_model.texture_states === model.texture_states
            ? updated_model
            : {
                  ...updated_model,
                  imagesState:
                      states.length < frames.length ||
                      states.includes("loading")
                          ? ImagesLoading()
                          : states.includes("failed")
                            ? ImagesFailed({
                                  error: "Some artworks could not load.",
                              })
                            : ImagesLoaded(),
              }
    const scene_changed =
        next_model.grid_view !== model.grid_view ||
        next_model.route._tag !== model.route._tag ||
        next_model.textOverrides !== model.textOverrides ||
        next_model.image_settings !== model.image_settings
    return [
        next_model,
        scene_changed ? [...commands, syncGalleryScene(next_model)] : commands,
    ]
}

const updateMessage = (
    model: Model,
    message: Message,
    hrefs: Gallery3dEditHrefs
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedEditArtwork: () => [
                { ...model, editing: !model.editing },
                [],
            ],
            ClickedBrowseArtwork: ({ direction }) => {
                const selected_key = Option.getOrUndefined(
                    model.selectedFrameKey
                )
                const index =
                    selected_key !== undefined
                        ? frames.findIndex(
                              (frame) => frame.key === selected_key
                          )
                        : direction === 1
                          ? -1
                          : 0
                const frame =
                    frames[(index + direction + frames.length) % frames.length]
                return frame === undefined
                    ? [model, []]
                    : updateMessage(
                          model,
                          model.grid_view
                              ? {
                                    _tag: "ClickedArtworkListItem",
                                    frameKey: frame.key,
                                }
                              : {
                                    _tag: "ClickedFrame",
                                    frameKey: frame.key,
                                },
                          hrefs
                      )
            },
            ToggledGridView: () =>
                model.grid_view
                    ? [
                          {
                              ...model,
                              route: Gallery3dEditIndexRoute(),
                              grid_view: false,
                              selectedFrameKey: Option.none(),
                              editing: false,
                          },
                          [navigateGallery(hrefs.index())],
                      ]
                    : [
                          {
                              ...model,
                              route: Gallery3dEditArtworkListRoute(),
                              grid_view: true,
                              selectedFrameKey: Option.none(),
                              editing: false,
                          },
                          [navigateGallery(hrefs.artwork_list())],
                      ],
            ChangedImageSettings: ({ frame_key, settings }) => [
                {
                    ...model,
                    image_settings: Record.set(
                        model.image_settings,
                        frame_key,
                        settings
                    ),
                },
                [],
            ],
            CompletedSyncScene: () => [model, []],
            FailedSyncScene: ({ error }) => [
                { ...model, maybeError: Option.some(error) },
                [],
            ],
            ClickedRetryImages: () => {
                if (model.image_busy) return [model, []]
                const failed_keys = frames
                    .filter(
                        (frame) => model.texture_states[frame.key] === "failed"
                    )
                    .map((frame) => frame.key)
                const texture_states = { ...model.texture_states }
                for (const key of failed_keys) texture_states[key] = "loading"
                return [
                    {
                        ...model,
                        texture_states,
                        maybeError: model.scene_available
                            ? Option.none()
                            : model.maybeError,
                    },
                    model.scene_available
                        ? [retryGalleryImages(failed_keys)]
                        : [],
                ]
            },
            UpdatedTextureState: ({ frame_key, status }) => {
                const texture_states = Record.set(
                    model.texture_states,
                    frame_key,
                    status
                )
                return [
                    {
                        ...model,
                        texture_states,
                    },
                    [],
                ]
            },
            ClickedFrame: ({ frameKey }) => [
                {
                    ...model,
                    route: Gallery3dEditItemRoute({ frameKey }),
                    grid_view: false,
                    selectedFrameKey: Option.some(frameKey),
                    editing: false,
                },
                [
                    ...(model.scene_available ? [focusFrame(frameKey)] : []),
                    navigateGallery(hrefs.item(frameKey)),
                ],
            ],
            ClickedDetails: ({ frameKey }) => [
                {
                    ...model,
                    route: Gallery3dEditItemDetailsRoute({ frameKey }),
                    grid_view: false,
                    selectedFrameKey: Option.some(frameKey),
                },
                [
                    ...(model.scene_available ? [focusFrame(frameKey)] : []),
                    navigateGallery(hrefs.details(frameKey)),
                ],
            ],
            ClickedArtworkList: () => [
                {
                    ...model,
                    route: Gallery3dEditArtworkListRoute(),
                    grid_view: true,
                    selectedFrameKey: Option.none(),
                    editing: false,
                },
                [navigateGallery(hrefs.artwork_list())],
            ],
            ClickedArtworkListItem: ({ frameKey }) => [
                {
                    ...model,
                    route: Gallery3dEditArtworkDetailsRoute({ frameKey }),
                    grid_view: true,
                    selectedFrameKey: Option.some(frameKey),
                    editing: false,
                },
                [navigateGallery(hrefs.artwork_details(frameKey))],
            ],
            ClickedCloseEditor: () => [
                {
                    ...model,
                    route: Gallery3dEditIndexRoute(),
                    grid_view: false,
                    selectedFrameKey: Option.none(),
                    editing: false,
                },
                [navigateGallery(hrefs.index())],
            ],
            ClickedResetView: () => [
                {
                    ...model,
                    route: Gallery3dEditIndexRoute(),
                    grid_view: false,
                    selectedFrameKey: Option.none(),
                    editing: false,
                },
                [resetCameraToDefault(), navigateGallery(hrefs.index())],
            ],
            ChangedGalleryRoute: ({ route }) => {
                const maybeFrameKey =
                    route._tag === "Gallery3dEdit" ||
                    route._tag === "Gallery3dEditArtworkList"
                        ? Option.none<string>()
                        : Option.some(route.frameKey)
                const grid_view =
                    route._tag === "Gallery3dEditArtworkList" ||
                    route._tag === "Gallery3dEditArtworkDetails"
                const focus_scene =
                    route._tag === "Gallery3dEditItem" ||
                    route._tag === "Gallery3dEditItemDetails"

                return [
                    {
                        ...model,
                        route,
                        grid_view,
                        selectedFrameKey: maybeFrameKey,
                        editing: false,
                    },
                    Option.match(maybeFrameKey, {
                        onNone: () => [],
                        onSome: (frameKey) =>
                            model.scene_available && focus_scene
                                ? [focusFrame(frameKey)]
                                : [],
                    }),
                ]
            },
            CompletedNavigateGallery: () => [model, []],
            HoveredFrame: () => [model, []],
            UnhoveredFrame: () => [model, []],
            SucceededMountGallery: () => [
                {
                    ...model,
                    maybeError: Option.none(),
                    scene_available: true,
                },
                [
                    syncGalleryScene(model),
                    ...(Option.isSome(model.selectedFrameKey)
                        ? [focusFrame(model.selectedFrameKey.value)]
                        : []),
                ],
            ],
            FailedMountGallery: ({ reason }) => [
                {
                    ...model,
                    route: Gallery3dEditArtworkListRoute(),
                    maybeError: Option.some(reason),
                    grid_view: true,
                    scene_available: false,
                },
                [navigateGallery(hrefs.artwork_list())],
            ],
            CompletedLoadImages: () => [model, []],
            FailedLoadImages: ({ error }) => [
                {
                    ...model,
                    maybeError: Option.some(error),
                },
                [],
            ],
            SucceededFocusFrame: () => [
                {
                    ...model,
                    maybeError: Option.none(),
                },
                [],
            ],
            FailedFocusFrame: ({ error }) => [
                {
                    ...model,
                    maybeError: Option.some(error),
                },
                [],
            ],
            SucceededResetCamera: () => [model, []],
            FailedResetCamera: ({ error }) => [
                {
                    ...model,
                    maybeError: Option.some(error),
                },
                [],
            ],
            GotFileDropMessage: ({ message: fileDropMessage }) => {
                if (model.image_busy) return [model, []]
                const {
                    model: nextFileDrop,
                    commands: fileDropCommands = [],
                    outMessage: maybeOutMessage_value,
                } = FileDrop.update(model.fileDrop, fileDropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const replaceCommands = Option.match(maybeOutMessage, {
                    onNone: () => [],
                    onSome: M.type<FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) =>
                                Option.match(model.selectedFrameKey, {
                                    onNone: () => [],
                                    onSome: (frameKey) => [
                                        replaceFrameImage(
                                            frameKey,
                                            Array.headNonEmpty(files),
                                            Record.get(
                                                model.imageOverrides,
                                                frameKey
                                            )
                                        ),
                                    ],
                                }),
                            RejectedNonFiles: () => [],
                        })
                    ),
                })

                return [
                    modifyFields(model, {
                        fileDrop: () => nextFileDrop,
                        image_busy: () => replaceCommands.length > 0,
                    }),
                    [
                        ...Command.mapMessages(
                            fileDropCommands,
                            (nestedMessage) =>
                                GotFileDropMessage({
                                    message: nestedMessage,
                                })
                        ),
                        ...replaceCommands,
                    ],
                ]
            },
            ClickedRestoreFrameImage: ({ frameKey }) =>
                model.image_busy
                    ? [model, []]
                    : Option.match(Record.get(model.imageOverrides, frameKey), {
                          onNone: () => [model, []],
                          onSome: (objectUrl) => [
                              { ...model, image_busy: true },
                              [restoreFrameImage(frameKey, objectUrl)],
                          ],
                      }),
            SucceededReplaceFrameImage: ({ frameKey, objectUrl }) => [
                modifyFields(model, {
                    image_busy: () => false,
                    texture_states: (states) =>
                        Record.set(states, frameKey, "loaded"),
                    imageOverrides: (imageOverrides) =>
                        Record.set(imageOverrides, frameKey, objectUrl),
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            FailedReplaceFrameImage: ({ error }) => [
                modifyFields(model, {
                    image_busy: () => false,
                    maybeError: () => Option.some(error),
                }),
                [],
            ],
            SucceededRestoreFrameImage: ({ frameKey }) => [
                modifyFields(model, {
                    image_busy: () => false,
                    texture_states: (states) =>
                        Record.set(states, frameKey, "loaded"),
                    imageOverrides: (imageOverrides) =>
                        Record.remove(imageOverrides, frameKey),
                }),
                [],
            ],
            FailedRestoreFrameImage: ({ error }) => [
                modifyFields(model, {
                    image_busy: () => false,
                    maybeError: () => Option.some(error),
                }),
                [],
            ],
            ChangedGalleryText: ({ frameKey, field, value }) => {
                const maybeDefaultText = Option.fromUndefinedOr(
                    getGalleryText(frameKey)
                )
                return Option.match(maybeDefaultText, {
                    onNone: () => [model, []],
                    onSome: (defaultText) => {
                        const currentText = Option.getOrElse(
                            Record.get(model.textOverrides, frameKey),
                            () => defaultText
                        )
                        const nextText = updateGalleryText(
                            currentText,
                            field,
                            value
                        )

                        return [
                            modifyFields(model, {
                                textOverrides: (textOverrides) =>
                                    Record.set(
                                        textOverrides,
                                        frameKey,
                                        nextText
                                    ),
                            }),
                            [],
                        ]
                    },
                })
            },
        })
    )

const updateGalleryText = (
    text: GalleryText,
    field:
        | "title"
        | "artist"
        | "year"
        | "medium"
        | "dimensions"
        | "price"
        | "description",
    value: string
): GalleryText => {
    switch (field) {
        case "title":
            return modifyFields(text, { title: () => value })
        case "artist":
            return modifyFields(text, { artist: () => value })
        case "year":
            return modifyFields(text, { year: () => value })
        case "medium":
            return modifyFields(text, { medium: () => value })
        case "dimensions":
            return modifyFields(text, { dimensions: () => value })
        case "price":
            return modifyFields(text, { price: () => value })
        case "description":
            return modifyFields(text, { description: () => value })
    }
}
