import { Array as Arr, Effect, Option, pipe } from "effect"
import { File, Mount } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { toImageSrc } from "@urm/utils/media"
import {
    IconChevronLeft,
    IconChevronRight,
    IconGripVertical,
} from "@urm/ui/foldkit/icons/view.ts"

// The gallery's own Message is a strict subset of the media app's, with
// identical constructors, and `HtmlBuilder` is invariant in its Message -- so
// the shared render functions take the wider builder and the platform can reuse
// them directly.
import type { Message as AppMessage } from "../platform/app.message.ts"
import { libraryHref } from "../platform/route.ts"

import {
    ClickedDeleteImage,
    ClickedMoveImage,
    ClickedSaveImageEdits,
    ClickedUploadImages,
    ClosedGalleryImage,
    ClosedImageEditor,
    CompletedLayoutMasonry,
    EditingAltChanged,
    EditingTextChanged,
    GotDragAndDropMessage,
    GotUploadDropMessage,
    OpenedImageEditor,
    RemovedSelectedUploadFile,
    SelectedGalleryImage,
    ToggledGalleryEditing,
} from "./gallery.message.ts"
import type { Model } from "./gallery.model.ts"
const fileKey = (file: File.File): string =>
    `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleString()

const sortedImages = (model: Model) =>
    [...model.images].sort(
        (left, right) => left.order_position - right.order_position
    )

const imageTransitionStyle = (image: Model["images"][number]) => ({
    viewTransitionName: `media-gallery-image-${image.id}`,
    viewTransitionClass: "media-gallery-image",
})

const adjacentImage = (
    model: Model,
    image: Model["images"][number],
    offset: -1 | 1
): Model["images"][number] => {
    const images = sortedImages(model)
    const index = images.findIndex((candidate) => candidate.id === image.id)
    const adjacent_index = (index + offset + images.length) % images.length

    return images[adjacent_index] ?? image
}

const imageCardClassName = (isDragged: boolean, is_editing: boolean) =>
    [
        "masonry-item group self-start relative overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card transition-opacity",
        is_editing ? "cursor-grab" : "cursor-default",
        isDragged ? "opacity-40" : "hover:[box-shadow:var(--shadow-surface)]",
    ].join(" ")

const masonryGridKey = (model: Model) =>
    `${model.gallery_editing ? "editing" : "viewing"}:${Arr.map(
        sortedImages(model),
        ({ id }) => id
    ).join("|")}`

const imageSizeAttributes = (
    image: Model["images"][number],
    h: HtmlBuilder<AppMessage>
) => [
    ...(image.width === undefined ? [] : [h.Width(`${image.width}`)]),
    ...(image.height === undefined ? [] : [h.Height(`${image.height}`)]),
]

const LayoutMasonry = Mount.define("LayoutMasonry", {
    messages: [CompletedLayoutMasonry],
    execute: ({ element }) => {
        if (!(element instanceof HTMLElement)) {
            return Effect.acquireRelease(
                Effect.succeed(CompletedLayoutMasonry()),
                () => Effect.sync(() => undefined)
            )
        }

        return Effect.acquireRelease(
            Effect.sync(() => {
                let nextAnimationFrame: number | undefined
                const listeners: Array<
                    Readonly<{
                        image: HTMLImageElement
                        onLoad: () => void
                        onError: () => void
                    }>
                > = []

                const applyLayout = () => {
                    const isSimpleLayout =
                        element.classList.contains("grid-simple")

                    if (isSimpleLayout) {
                        Arr.fromIterable(
                            element.querySelectorAll<HTMLElement>(
                                ".masonry-item"
                            )
                        ).forEach((item) => {
                            item.style.removeProperty("margin-top")
                        })
                        return
                    }

                    try {
                        const gridStyles = window.getComputedStyle(element)
                        const columnCount = gridStyles.gridTemplateColumns
                            .trim()
                            .split(/\s+/).length
                        const rowGap = parseFloat(
                            gridStyles.rowGap || gridStyles.gridRowGap || "0"
                        )
                        const items = Arr.fromIterable(
                            element.querySelectorAll<HTMLElement>(
                                ".masonry-item"
                            )
                        )

                        items.forEach((item) => {
                            item.style.removeProperty("margin-top")
                        })

                        if (columnCount > 1) {
                            items.slice(columnCount).forEach((item, index) => {
                                const previousItem = items[index]

                                if (previousItem === undefined) {
                                    return
                                }

                                const previousBottom =
                                    previousItem.getBoundingClientRect().bottom
                                const currentTop =
                                    item.getBoundingClientRect().top
                                item.style.marginTop = `${previousBottom + rowGap - currentTop}px`
                            })
                        }
                    } catch (error) {
                        console.error("Masonry layout error:", error)
                    }
                }

                const scheduleLayout = () => {
                    if (nextAnimationFrame !== undefined) {
                        window.cancelAnimationFrame(nextAnimationFrame)
                    }

                    nextAnimationFrame = window.requestAnimationFrame(() => {
                        nextAnimationFrame = undefined
                        applyLayout()
                    })
                }

                const resizeObserver = new ResizeObserver(() => {
                    scheduleLayout()
                })

                Arr.fromIterable(
                    element.querySelectorAll<HTMLImageElement>("img")
                ).forEach((image) => {
                    if (image.complete) {
                        return
                    }

                    const onLoad = () => {
                        scheduleLayout()
                    }

                    const onError = () => {
                        scheduleLayout()
                    }

                    listeners.push({ image, onLoad, onError })
                    image.addEventListener("load", onLoad)
                    image.addEventListener("error", onError)
                })

                resizeObserver.observe(element)
                scheduleLayout()

                return {
                    cleanup: () => {
                        resizeObserver.disconnect()
                        listeners.forEach(({ image, onLoad, onError }) => {
                            image.removeEventListener("load", onLoad)
                            image.removeEventListener("error", onError)
                        })

                        if (nextAnimationFrame !== undefined) {
                            window.cancelAnimationFrame(nextAnimationFrame)
                        }
                    },
                }
            }),
            ({ cleanup }) => Effect.sync(cleanup)
        ).pipe(Effect.as(CompletedLayoutMasonry()))
    },
})()

const dropPlaceholder = (h: HtmlBuilder<AppMessage>): Html =>
    h.div(
        [
            h.Class(
                "masonry-item min-h-48 rounded-[var(--radius-surface)] border-2 border-dashed border-primary/40 bg-primary/10 pointer-events-none"
            ),
            h.AriaHidden(true),
        ],
        []
    )

const visibleImages = (
    model: Model
): ReadonlyArray<Model["images"][number]> => {
    if (
        !model.gallery_editing ||
        !Ui.DragAndDrop.isDragging(model.dragAndDrop)
    ) {
        return sortedImages(model)
    }

    return Option.match(Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
        onNone: () => sortedImages(model),
        onSome: (draggedId) =>
            sortedImages(model).filter((image) => image.id !== draggedId),
    })
}

const withDropPlaceholder = (
    model: Model,
    h: HtmlBuilder<AppMessage>,
    image_src: (url: string) => string
): ReadonlyArray<Html> => {
    const images = visibleImages(model)
    const elements = images.map((image, index) =>
        imageCard(model, image, index, h, image_src)
    )

    if (
        !model.gallery_editing ||
        !Ui.DragAndDrop.isDragging(model.dragAndDrop)
    ) {
        return elements
    }

    return Option.match(Ui.DragAndDrop.maybeDropTarget(model.dragAndDrop), {
        onNone: () => elements,
        onSome: (target) => {
            if (target.containerId !== "media-gallery") {
                return elements
            }

            const targetIndex = Math.min(target.index, elements.length)
            return pipe(
                elements,
                Arr.insertAt(targetIndex, dropPlaceholder(h)),
                Option.getOrElse(() => [...elements, dropPlaceholder(h)])
            )
        },
    })
}

const uploadTile = (model: Model, h: HtmlBuilder<AppMessage>): Html =>
    h.div(
        [
            h.Class(
                "masonry-item self-start overflow-hidden rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-card text-card-foreground transition-colors hover:border-primary"
            ),
        ],
        [
            h.submodel({
                slotId: model.uploadDrop.id,
                model: model.uploadDrop,
                view: Ui.FileDrop.view,
                viewInputs: {
                    multiple: true,
                    accept: [
                        "image/png",
                        "image/jpeg",
                        "image/webp",
                        "image/gif",
                    ],
                    toView: (attributes) =>
                        h.label(
                            [
                                ...attributes.root,
                                h.Class(
                                    "flex min-h-64 cursor-pointer select-none flex-col items-center justify-center gap-2 bg-muted/40 p-6 text-center data-[drag-over]:bg-accent"
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            "grid size-12 place-items-center rounded-full border-(length:--surface-border-width) border-border bg-background text-2xl text-muted-foreground"
                                        ),
                                        h.AriaHidden(true),
                                    ],
                                    ["+"]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "text-sm font-medium text-foreground"
                                        ),
                                    ],
                                    ["Add images"]
                                ),
                                h.p(
                                    [h.Class("text-xs text-muted-foreground")],
                                    ["Drop here or choose files"]
                                ),
                                h.input(attributes.input),
                            ]
                        ),
                },
                toParentMessage: (message) => GotUploadDropMessage({ message }),
            }),
            ...(model.selectedUploadFiles.length === 0
                ? []
                : [
                      h.div(
                          [
                              h.Class(
                                  "space-y-2 border-t-(length:--surface-border-width) border-border p-3"
                              ),
                          ],
                          [
                              h.div(
                                  [h.Class("flex flex-wrap gap-1.5")],
                                  model.selectedUploadFiles.map(
                                      (file, fileIndex) =>
                                          h.keyed("button")(
                                              fileKey(file),
                                              [
                                                  h.Type("button"),
                                                  h.OnClick(
                                                      RemovedSelectedUploadFile(
                                                          { fileIndex }
                                                      )
                                                  ),
                                                  h.Class(
                                                      "max-w-full truncate rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                                                  ),
                                                  h.Title(
                                                      `Remove ${File.name(file)}`
                                                  ),
                                              ],
                                              [File.name(file)]
                                          )
                                  )
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Disabled(model.uploadBusy),
                                      ...(model.can_write === false
                                          ? [h.Disabled(true)]
                                          : []),
                                      h.OnClick(ClickedUploadImages()),
                                      h.Class(
                                          "w-full rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] disabled:opacity-50"
                                      ),
                                  ],
                                  [
                                      model.uploadBusy
                                          ? "Uploading..."
                                          : `Upload ${model.selectedUploadFiles.length}`,
                                  ]
                              ),
                          ]
                      ),
                  ]),
        ]
    )

const inlineEditor = (
    model: Model,
    imageId: string,
    h: HtmlBuilder<AppMessage>
): Html => {
    if (!model.gallery_editing || model.editingImageId !== imageId) {
        return h.empty
    }

    const image = model.images.find((item) => item.id === imageId)
    if (image === undefined) {
        return h.empty
    }

    return h.div(
        [
            h.Class(
                "space-y-4 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        [
            h.div(
                [h.Class("grid gap-4 md:grid-cols-2")],
                [
                    h.label(
                        [h.Class("space-y-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "block text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Alt text"]
                            ),
                            h.input([
                                h.Value(model.editingAlt),
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    EditingAltChanged({ value })
                                ),
                            ]),
                        ]
                    ),
                    h.label(
                        [h.Class("space-y-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "block text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Notes"]
                            ),
                            h.textarea([
                                h.Value(model.editingText),
                                h.Class(
                                    "min-h-28 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    EditingTextChanged({ value })
                                ),
                            ]),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.div(
                        [h.Class("text-xs text-muted-foreground")],
                        [formatDate(image.updated_at)]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ClosedImageEditor()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Cancel"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    ...(model.can_write === false
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(ClickedSaveImageEdits()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                ["Save"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const imageCard = (
    model: Model,
    image: Model["images"][number],
    index: number,
    h: HtmlBuilder<AppMessage>,
    image_src: (url: string) => string
): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop)
    const isDragged = Option.exists(maybeItemId, (id) => id === image.id)
    const isKeyboardDragged =
        model.dragAndDrop.dragState._tag === "KeyboardDragging" && isDragged
    const isPointerDragged =
        model.dragAndDrop.dragState._tag === "Dragging" && isDragged
    const ordered_index = sortedImages(model).findIndex(
        (current) => current.id === image.id
    )
    const can_move_earlier = ordered_index > 0
    const can_move_later = ordered_index < model.images.length - 1
    const image_view = () =>
        h.img([
            h.Class("h-auto w-full object-cover"),
            h.Src(image_src(image.url)),
            h.Alt(image.alt),
            h.Draggable(false),
            h.Loading("lazy"),
            h.Style(imageTransitionStyle(image)),
            ...imageSizeAttributes(image, h),
        ])

    return h.keyed("article")(
        image.id,
        [
            h.Class(
                [
                    imageCardClassName(isDragged, model.gallery_editing),
                    isKeyboardDragged ? "border-primary" : "border-border",
                    isPointerDragged ? "opacity-40" : "",
                ].join(" ")
            ),
            ...(model.gallery_editing
                ? [
                      ...Ui.DragAndDrop.draggable<AppMessage>(
                          {
                              model: model.dragAndDrop,
                              toParentMessage: (message) =>
                                  GotDragAndDropMessage({ message }),
                              itemId: image.id,
                              containerId: "media-gallery",
                              index,
                          },
                          h
                      ),
                      ...Ui.DragAndDrop.sortable(image.id),
                  ]
                : []),
        ],
        [
            h.div(
                [
                    h.Class(
                        "relative overflow-hidden border-b-(length:--surface-border-width) border-border bg-muted"
                    ),
                ],
                [
                    model.gallery_editing
                        ? h.div([h.Class("w-full")], [image_view()])
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.AriaLabel(`Open ${image.alt} fullscreen`),
                                  h.OnClick(
                                      SelectedGalleryImage({
                                          imageId: image.id,
                                      })
                                  ),
                                  h.Class(
                                      "block w-full cursor-zoom-in p-0 text-left"
                                  ),
                              ],
                              [image_view()]
                          ),
                    ...(model.gallery_editing
                        ? [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.AriaLabel(`Drag ${image.alt}`),
                                      h.Title("Drag to reorder"),
                                      h.Class(
                                          "absolute right-2 top-2 grid size-8 touch-none cursor-grab place-items-center rounded-full bg-black/70 text-white [box-shadow:var(--shadow-overlay)] active:cursor-grabbing"
                                      ),
                                  ],
                                  [IconGripVertical({ class: "size-4" })]
                              ),
                          ]
                        : []),
                ]
            ),
            h.div(
                [
                    h.Class(
                        model.gallery_editing &&
                            model.editingImageId === image.id
                            ? "hidden"
                            : "space-y-2 p-4"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex items-start justify-between gap-3")],
                        [
                            h.div(
                                [h.Class("min-w-0")],
                                [
                                    h.h3(
                                        [
                                            h.Class(
                                                "truncate text-sm font-semibold text-foreground"
                                            ),
                                        ],
                                        [image.alt]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [formatDate(image.updated_at)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex shrink-0 items-center gap-1")],
                                [
                                    ...(model.gallery_editing
                                        ? [
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.AriaLabel(
                                                          `Move ${image.alt} earlier`
                                                      ),
                                                      h.Title("Move earlier"),
                                                      h.Disabled(
                                                          !can_move_earlier
                                                      ),
                                                      h.OnClick(
                                                          ClickedMoveImage({
                                                              imageId: image.id,
                                                              direction:
                                                                  "earlier",
                                                          })
                                                      ),
                                                      h.Class(
                                                          "grid size-7 place-items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                                      ),
                                                  ],
                                                  [
                                                      IconChevronLeft({
                                                          class: "size-3.5",
                                                      }),
                                                  ]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.AriaLabel(
                                                          `Move ${image.alt} later`
                                                      ),
                                                      h.Title("Move later"),
                                                      h.Disabled(
                                                          !can_move_later
                                                      ),
                                                      h.OnClick(
                                                          ClickedMoveImage({
                                                              imageId: image.id,
                                                              direction:
                                                                  "later",
                                                          })
                                                      ),
                                                      h.Class(
                                                          "grid size-7 place-items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                                      ),
                                                  ],
                                                  [
                                                      IconChevronRight({
                                                          class: "size-3.5",
                                                      }),
                                                  ]
                                              ),
                                          ]
                                        : []),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border-(length:--surface-border-width) border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground"
                                            ),
                                        ],
                                        [globalThis.String(index + 1)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    ...(image.text.trim().length === 0
                        ? [
                              h.p(
                                  [
                                      h.Class(
                                          "text-sm leading-6 text-muted-foreground"
                                      ),
                                  ],
                                  ["No notes yet."]
                              ),
                          ]
                        : [
                              h.p(
                                  [
                                      h.Class(
                                          "text-sm leading-6 text-muted-foreground"
                                      ),
                                  ],
                                  [image.text]
                              ),
                          ]),
                    ...(model.gallery_editing
                        ? [
                              h.div(
                                  [
                                      h.Class(
                                          "flex items-center justify-end gap-1 border-t-(length:--surface-border-width) border-border pt-3"
                                      ),
                                  ],
                                  [
                                      h.button(
                                          [
                                              h.Type("button"),
                                              ...(model.can_write === false
                                                  ? [h.Disabled(true)]
                                                  : []),
                                              h.OnClick(
                                                  OpenedImageEditor({
                                                      imageId: image.id,
                                                  })
                                              ),
                                              h.Class(
                                                  "rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                              ),
                                          ],
                                          ["Edit"]
                                      ),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              ...(model.can_write === false
                                                  ? [h.Disabled(true)]
                                                  : []),
                                              h.OnClick(
                                                  ClickedDeleteImage({
                                                      imageId: image.id,
                                                  })
                                              ),
                                              h.Class(
                                                  "rounded-[var(--radius-control)] px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                              ),
                                          ],
                                          ["Delete"]
                                      ),
                                  ]
                              ),
                          ]
                        : []),
                ]
            ),
            inlineEditor(model, image.id, h),
        ]
    )
}

const dragGhost = (
    model: Model,
    h: HtmlBuilder<AppMessage>,
    image_src: (url: string) => string
): Html => {
    if (!model.gallery_editing) {
        return h.empty
    }

    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop)

    return Option.match(Ui.DragAndDrop.ghostStyle(model.dragAndDrop), {
        onNone: () => h.empty,
        onSome: (ghostStyle) =>
            Option.match(maybeItemId, {
                onNone: () => h.empty,
                onSome: (itemId) => {
                    const image = model.images.find(
                        (current) => current.id === itemId
                    )

                    if (image === undefined) {
                        return h.empty
                    }

                    return h.div(
                        [
                            h.Style(ghostStyle),
                            h.Class(
                                "w-64 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-overlay)]"
                            ),
                            h.AriaHidden(true),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "aspect-[4/3] overflow-hidden bg-muted"
                                    ),
                                ],
                                [
                                    h.img([
                                        h.Class("h-full w-full object-cover"),
                                        h.Src(image_src(image.url)),
                                        h.Alt(image.alt),
                                    ]),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "p-3 text-sm font-medium text-foreground"
                                    ),
                                ],
                                [image.alt]
                            ),
                        ]
                    )
                },
            }),
    })
}

const fullscreenImage = (
    model: Model,
    image: Model["images"][number],
    h: HtmlBuilder<AppMessage>,
    image_src: (url: string) => string,
    back_label = "Back to gallery"
): Html => {
    const previous_image = adjacentImage(model, image, -1)
    const next_image = adjacentImage(model, image, 1)
    const has_multiple_images = model.images.length > 1
    const dimensions =
        image.width === undefined || image.height === undefined
            ? "Unknown"
            : `${image.width} × ${image.height}`

    return h.keyed("section")(
        image.id,
        [
            h.Class(
                "fixed inset-0 z-50 grid min-h-dvh overflow-y-auto bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_24rem]"
            ),
            h.Attribute("role", "dialog"),
            h.AriaModal(true),
            h.AriaLabel(`${image.alt} details`),
            h.OnKeyDownPreventDefault((key) =>
                key === "Escape"
                    ? Option.some(ClosedGalleryImage())
                    : key === "ArrowLeft"
                      ? Option.some(
                            SelectedGalleryImage({
                                imageId: previous_image.id,
                            })
                        )
                      : key === "ArrowRight"
                        ? Option.some(
                              SelectedGalleryImage({
                                  imageId: next_image.id,
                              })
                          )
                        : Option.none()
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "relative grid min-h-[65vh] place-items-center overflow-hidden bg-black p-4 lg:min-h-dvh lg:p-8"
                    ),
                ],
                [
                    h.img([
                        h.Class(
                            "max-h-[calc(100vh-4rem)] max-w-full object-contain"
                        ),
                        h.Src(image_src(image.url)),
                        h.Alt(image.alt),
                        h.Style(imageTransitionStyle(image)),
                        ...imageSizeAttributes(image, h),
                    ]),
                ]
            ),
            h.aside(
                [
                    h.Class(
                        "flex min-h-full flex-col border-l-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground lg:p-8"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "mb-12 inline-flex w-fit items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent"
                            ),
                            h.OnClick(ClosedGalleryImage()),
                            h.Attribute("autofocus", ""),
                        ],
                        [IconChevronLeft({ class: "size-4" }), back_label]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            ),
                        ],
                        [`Image ${sortedImages(model).indexOf(image) + 1}`]
                    ),
                    h.h2(
                        [h.Class("m-0 text-4xl font-bold tracking-[-0.04em]")],
                        [image.alt]
                    ),
                    ...(image.text.trim().length === 0
                        ? []
                        : [
                              h.p(
                                  [
                                      h.Class(
                                          "mt-5 text-base leading-7 text-muted-foreground"
                                      ),
                                  ],
                                  [image.text]
                              ),
                          ]),
                    h.div(
                        [
                            h.Class(
                                "mt-8 grid grid-cols-2 gap-3 border-t border-border pt-6"
                            ),
                        ],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(!has_multiple_images),
                                    h.Class(
                                        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
                                    ),
                                    h.OnClick(
                                        SelectedGalleryImage({
                                            imageId: previous_image.id,
                                        })
                                    ),
                                ],
                                [
                                    IconChevronLeft({ class: "size-4" }),
                                    "Previous",
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(!has_multiple_images),
                                    h.Class(
                                        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
                                    ),
                                    h.OnClick(
                                        SelectedGalleryImage({
                                            imageId: next_image.id,
                                        })
                                    ),
                                ],
                                ["Next", IconChevronRight({ class: "size-4" })]
                            ),
                        ]
                    ),
                    h.dl(
                        [
                            h.Class(
                                "mt-auto grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 border-t border-border pt-6 text-sm"
                            ),
                        ],
                        [
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                ["Format"]
                            ),
                            h.dd([h.Class("m-0 font-medium")], [dimensions]),
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                ["Updated"]
                            ),
                            h.dd(
                                [h.Class("m-0 font-medium")],
                                [formatDate(image.updated_at)]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const galleryContent = (
    model: Model,
    h: HtmlBuilder<AppMessage>,
    library_href: () => string = libraryHref,
    image_src: (url: string) => string = toImageSrc
): Html => {
    const selected_image = model.images.find(
        (image) => image.id === model.selected_gallery_image_id
    )

    if (!model.gallery_editing && selected_image !== undefined) {
        return fullscreenImage(model, selected_image, h, image_src)
    }

    return h.div(
        [h.Class("mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8")],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Gallery"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Masonry gallery with uploads, inline edits, deletes, and drag reorder.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex items-center gap-2 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.span(
                                [],
                                [`${sortedImages(model).length} images`]
                            ),
                            h.a(
                                [
                                    h.Href(library_href()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-2 py-1 text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Library"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center gap-3 font-medium text-foreground"
                                    ),
                                ],
                                [
                                    h.span([], ["Edit"]),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Role("switch"),
                                            h.AriaChecked(
                                                model.gallery_editing
                                            ),
                                            h.AriaLabel("Edit gallery"),
                                            ...(model.can_write === false
                                                ? [h.Disabled(true)]
                                                : []),
                                            h.OnClick(ToggledGalleryEditing()),
                                            h.Class(
                                                model.gallery_editing
                                                    ? "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-(length:--control-border-width) border-border bg-primary transition-colors [box-shadow:var(--shadow-primary)]"
                                                    : "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        model.gallery_editing
                                                            ? "pointer-events-none inline-block size-4 translate-x-6 rounded-full bg-background shadow transition-transform"
                                                            : "pointer-events-none inline-block size-4 translate-x-1 rounded-full bg-background shadow transition-transform"
                                                    ),
                                                ],
                                                []
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            ...(model.error === null
                ? []
                : [
                      h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                              ),
                          ],
                          [model.error]
                      ),
                  ]),
            ...(model.loading
                ? [
                      h.div(
                          [h.Class("text-sm text-muted-foreground")],
                          ["Loading images..."]
                      ),
                  ]
                : []),
            ...(sortedImages(model).length === 0 &&
            !model.loading &&
            !model.gallery_editing
                ? [
                      h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                              ),
                          ],
                          ["No images yet."]
                      ),
                  ]
                : []),
            h.div(
                [
                    h.Key(masonryGridKey(model)),
                    h.Class(
                        model.gallery_editing &&
                            Ui.DragAndDrop.isDragging(model.dragAndDrop)
                            ? "grid-simple grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-2 p-2"
                            : "grid--masonry grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-2 p-2 [grid-template-rows:masonry]"
                    ),
                    h.OnMount(LayoutMasonry),
                    ...(model.gallery_editing
                        ? Ui.DragAndDrop.droppable("media-gallery", "Gallery")
                        : []),
                ],
                [
                    ...(model.gallery_editing ? [uploadTile(model, h)] : []),
                    ...withDropPlaceholder(model, h, image_src),
                ]
            ),
            dragGhost(model, h, image_src),
            h.div(
                [h.Class("sr-only"), h.AriaLive("assertive")],
                [model.loading ? "Loading" : "Ready"]
            ),
        ]
    )
}

export const view = (model: Model, h: HtmlBuilder<AppMessage>): Document => ({
    title: "Gallery | Media",
    body: h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [galleryContent(model, h)]
    ),
})

export { fullscreenImage, galleryContent, imageTransitionStyle }
