import { Effect, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import { imagesApi } from "../platform/app.rpc.ts"
import {
    DeleteImageFailed,
    DeletedImage,
    FailedLoadingImages,
    GotDragAndDropMessage,
    GotUploadDropMessage,
    ImageEditsSaveFailed,
    LoadedImages,
    ReorderImagesFailed,
    ReorderedImages,
    SavedImageEdits,
    UploadedImages,
    UploadImagesFailed,
    type Message,
} from "./gallery.message.ts"
import { Model } from "./gallery.model.ts"
import { Image } from "@urm/domain/schemas/media"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const GALLERY_IMAGE_CATEGORY = "gallery"
const UploadGalleryImages = Command.define("UploadGalleryImages", {
    args: { model: Model },
    messages: [UploadedImages, UploadImagesFailed],
    execute: () =>
        Effect.succeed(
            UploadImagesFailed({
                error: "Image uploads require the authenticated application host.",
            })
        ),
})
const SaveGalleryImageEdits = Command.define("SaveGalleryImageEdits", {
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
const DeleteGalleryImage = Command.define("DeleteGalleryImage", {
    args: { imageId: S.String },
    messages: [DeletedImage, DeleteImageFailed],
    execute: ({ imageId }) =>
        Effect.tryPromise(() => deleteImage(imageId)).pipe(
            Effect.map(() => DeletedImage({ imageId })),
            Effect.catch((error) =>
                Effect.succeed(
                    DeleteImageFailed({
                        error: toErrorMessage(error),
                    })
                )
            )
        ),
})
const ReorderGalleryImages = Command.define("ReorderGalleryImages", {
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

const toErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : globalThis.String(error)

const sortImages = (images: ReadonlyArray<Image>): ReadonlyArray<Image> =>
    [...images].sort((left, right) => {
        if (left.order_position !== right.order_position) {
            return left.order_position - right.order_position
        }

        return left.updated_at - right.updated_at
    })

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

    const updated = await imagesApi.update({
        id: current.id,
        data: {
            url: current.url,
            alt: model.editingAlt,
            text: model.editingText,
            category: current.category ?? GALLERY_IMAGE_CATEGORY,
            order_position: current.order_position,
            updated_at: Date.now(),
        },
    })

    return updated.item
}

const deleteImage = async (imageId: string): Promise<string> => {
    await imagesApi.delete({ id: imageId })
    return imageId
}

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

const moveImage = (
    images: ReadonlyArray<Image>,
    imageId: string,
    direction: "earlier" | "later"
): ReadonlyArray<Image> => {
    const ordered_images = sortImages(images)
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
): ReadonlyArray<Command.Command<Message>> => [ReorderGalleryImages({ images })]
const LoadGalleryImages = Command.define("LoadGalleryImages", {
    messages: [LoadedImages, FailedLoadingImages],
    execute: Effect.tryPromise(() => imagesApi.list()).pipe(
        Effect.map((images) => LoadedImages({ images: sortImages(images) })),
        Effect.catch((error) =>
            Effect.succeed(
                FailedLoadingImages({
                    error: toErrorMessage(error),
                })
            )
        )
    ),
})

export const init = (): UpdateReturn => [
    {
        loading: true,
        error: null,
        images: [],
        uploadDrop: Ui.FileDrop.init({ id: "media-gallery-upload-drop" }),
        selectedUploadFiles: [],
        uploadPanelOpen: true,
        uploadBusy: false,
        gallery_editing: false,
        selected_gallery_image_id: null,
        editingImageId: null,
        editingAlt: "",
        editingText: "",
        dragAndDrop: Ui.DragAndDrop.init({ id: "media-gallery" }),
    },
    [LoadGalleryImages()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            LoadedImages: ({ images }) => [
                modifyFields(model, {
                    loading: () => false,
                    error: () => null,
                    images: () => sortImages(images),
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

                return [
                    modifyFields(model, {
                        uploadBusy: () => true,
                        error: () => null,
                    }),
                    [UploadGalleryImages({ model })],
                ]
            },

            UploadedImages: ({ images }) => [
                modifyFields(model, {
                    images: () => sortImages([...model.images, ...images]),
                    uploadBusy: () => false,
                    uploadPanelOpen: () => false,
                    selectedUploadFiles: () => [],
                }),
                [],
            ],

            UploadImagesFailed: ({ error }) => [
                modifyFields(model, {
                    uploadBusy: () => false,
                    error: () => error,
                }),
                [],
            ],

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
                    }),
                    [],
                ]
            },

            ClosedImageEditor: () => [
                modifyFields(model, {
                    editingImageId: () => null,
                    editingAlt: () => "",
                    editingText: () => "",
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

            ClickedSaveImageEdits: () => {
                if (model.editingImageId === null) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        error: () => null,
                    }),
                    [SaveGalleryImageEdits({ model })],
                ]
            },

            SavedImageEdits: ({ image }) => [
                modifyFields(model, {
                    images: () =>
                        sortImages(
                            model.images.map((current) =>
                                current.id === image.id ? image : current
                            )
                        ),
                    editingImageId: () => null,
                    editingAlt: () => "",
                    editingText: () => "",
                }),
                [],
            ],

            ImageEditsSaveFailed: ({ error }) => [
                modifyFields(model, {
                    error: () => error,
                }),
                [],
            ],

            ClickedDeleteImage: ({ imageId }) => [
                modifyFields(model, {
                    error: () => null,
                }),
                [DeleteGalleryImage({ imageId })],
            ],

            DeletedImage: ({ imageId }) => [
                modifyFields(model, {
                    images: () =>
                        model.images.filter((image) => image.id !== imageId),
                    editingImageId: (current) =>
                        current === imageId ? null : current,
                    selected_gallery_image_id: (current) =>
                        current === imageId ? null : current,
                    editingAlt: (current) =>
                        model.editingImageId === imageId ? "" : current,
                    editingText: (current) =>
                        model.editingImageId === imageId ? "" : current,
                }),
                [],
            ],

            DeleteImageFailed: ({ error }) => [
                modifyFields(model, {
                    error: () => error,
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
                                    const nextImages = reorderImages(
                                        sortImages(model.images),
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
        })
    )
