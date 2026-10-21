import { Array as Arr, Effect, Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    IconArrowLeft,
    IconArrowRight,
    IconCamera,
} from "@urm/ui/foldkit/icons/view.ts"

import { findGalleryImage, gallery_images, type GalleryImage } from "./data.ts"
import {
    ClosedGalleryImage,
    CompletedGalleryMasonry,
    SelectedGalleryImage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const imageTransitionStyle = (image: GalleryImage) => ({
    viewTransitionName: `gallery-demo-image-${image.id}`,
    viewTransitionClass: "gallery-demo-image",
})

const adjacentImage = (image: GalleryImage, offset: -1 | 1): GalleryImage => {
    const index = gallery_images.findIndex(
        (candidate) => candidate.id === image.id
    )
    const adjacent_index =
        (index + offset + gallery_images.length) % gallery_images.length

    return gallery_images[adjacent_index] ?? image
}

const LayoutGalleryMasonry = Mount.define("LayoutGalleryMasonry", {
    messages: [CompletedGalleryMasonry],
    execute: ({ element }) => {
        if (!(element instanceof HTMLElement)) {
            return Effect.succeed(CompletedGalleryMasonry())
        }

        return Effect.acquireRelease(
            Effect.sync(() => {
                let next_animation_frame: number | undefined
                let last_column_count: number | undefined

                const apply_layout = () => {
                    const styles = window.getComputedStyle(element)
                    const column_count = styles.gridTemplateColumns
                        .trim()
                        .split(/\s+/).length
                    const row_gap = Number.parseFloat(styles.rowGap || "0")
                    const items = Arr.fromIterable(
                        element.querySelectorAll<HTMLElement>(".masonry-item")
                    )

                    if (last_column_count === column_count) {
                        return
                    }

                    items.forEach((item) => {
                        item.style.removeProperty("margin-top")
                    })

                    if (column_count > 1) {
                        items.slice(column_count).forEach((item, index) => {
                            const previous_item = items[index]

                            if (previous_item === undefined) {
                                return
                            }

                            const previous_bottom =
                                previous_item.getBoundingClientRect().bottom
                            const current_top = item.getBoundingClientRect().top
                            item.style.marginTop = `${previous_bottom + row_gap - current_top}px`
                        })
                    }

                    last_column_count = column_count
                }

                const schedule_layout = () => {
                    if (next_animation_frame !== undefined) {
                        window.cancelAnimationFrame(next_animation_frame)
                    }

                    next_animation_frame = window.requestAnimationFrame(() => {
                        next_animation_frame = undefined
                        last_column_count = undefined
                        apply_layout()
                    })
                }

                const resize_observer = new ResizeObserver(schedule_layout)
                const images = Arr.fromIterable(
                    element.querySelectorAll<HTMLImageElement>("img")
                )

                images.forEach((image) => {
                    image.addEventListener("load", schedule_layout)
                    image.addEventListener("error", schedule_layout)
                })
                resize_observer.observe(element)
                schedule_layout()

                return () => {
                    resize_observer.disconnect()
                    images.forEach((image) => {
                        image.removeEventListener("load", schedule_layout)
                        image.removeEventListener("error", schedule_layout)
                    })

                    if (next_animation_frame !== undefined) {
                        window.cancelAnimationFrame(next_animation_frame)
                    }
                }
            }),
            (cleanup) => Effect.sync(cleanup)
        ).pipe(Effect.as(CompletedGalleryMasonry()))
    },
})()

const galleryCard = (image: GalleryImage, h: HtmlBuilder<Message>): Html =>
    h.keyed("button")(
        image.id,
        [
            h.Type("button"),
            h.Class(
                "masonry-item group relative self-start overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-0 text-left text-card-foreground [box-shadow:var(--shadow-control)] transition hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            ),
            h.AriaLabel(`Open ${image.title}`),
            h.OnClick(SelectedGalleryImage({ id: image.id })),
        ],
        [
            h.div(
                [h.Class("overflow-hidden bg-muted")],
                [
                    h.img([
                        h.Class(
                            "h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        ),
                        h.Src(image.url),
                        h.Alt(image.alt),
                        h.Width(String(image.width)),
                        h.Height(String(image.height)),
                        h.Loading("lazy"),
                        h.Style(imageTransitionStyle(image)),
                    ]),
                ]
            ),
            h.div(
                [h.Class("flex items-start justify-between gap-3 p-4")],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.h3(
                                [h.Class("m-0 text-base font-semibold")],
                                [image.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-1 mb-0 text-xs text-muted-foreground"
                                    ),
                                ],
                                [image.location]
                            ),
                        ]
                    ),
                    IconCamera({ class: "mt-0.5 size-4 shrink-0 opacity-50" }),
                ]
            ),
        ]
    )

const gallery = (h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("bg-background p-4 text-foreground sm:p-6")],
        [
            h.div(
                [h.Class("mb-6 flex items-end justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                                    ),
                                ],
                                ["Static collection"]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "m-0 text-3xl font-bold tracking-tight"
                                    ),
                                ],
                                ["Field notes"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 mb-0 max-w-xl text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Select an image to move it into a fullscreen details view.",
                                ]
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class("shrink-0 text-sm text-muted-foreground")],
                        [`${gallery_images.length} images`]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3"
                    ),
                    h.OnMount(LayoutGalleryMasonry),
                ],
                gallery_images.map((image) => galleryCard(image, h))
            ),
        ]
    )

const details = (image: GalleryImage, h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.Class(
                "fixed inset-0 z-50 grid min-h-dvh overflow-y-auto bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_24rem]"
            ),
            h.Attribute("role", "dialog"),
            h.AriaModal(true),
            h.AriaLabel(`${image.title} details`),
            h.OnKeyDownPreventDefault((key) =>
                key === "ArrowLeft"
                    ? Option.some(
                          SelectedGalleryImage({
                              id: adjacentImage(image, -1).id,
                          })
                      )
                    : key === "ArrowRight"
                      ? Option.some(
                            SelectedGalleryImage({
                                id: adjacentImage(image, 1).id,
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
                        h.Src(image.url),
                        h.Alt(image.alt),
                        h.Width(String(image.width)),
                        h.Height(String(image.height)),
                        h.Style(imageTransitionStyle(image)),
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
                                "mb-12 inline-flex w-fit items-center gap-2 rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent"
                            ),
                            h.OnClick(ClosedGalleryImage()),
                            h.Attribute("autofocus", ""),
                        ],
                        [IconArrowLeft({ class: "size-4" }), "Back to gallery"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            ),
                        ],
                        [image.location]
                    ),
                    h.h2(
                        [h.Class("m-0 text-4xl font-bold tracking-[-0.04em]")],
                        [image.title]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-5 text-base leading-7 text-muted-foreground"
                            ),
                        ],
                        [image.description]
                    ),
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
                                    h.Class(
                                        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent"
                                    ),
                                    h.OnClick(
                                        SelectedGalleryImage({
                                            id: adjacentImage(image, -1).id,
                                        })
                                    ),
                                ],
                                [IconArrowLeft({ class: "size-4" }), "Previous"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(
                                        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent"
                                    ),
                                    h.OnClick(
                                        SelectedGalleryImage({
                                            id: adjacentImage(image, 1).id,
                                        })
                                    ),
                                ],
                                ["Next", IconArrowRight({ class: "size-4" })]
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
                            h.dt([h.Class("text-muted-foreground")], ["By"]),
                            h.dd(
                                [h.Class("m-0 font-medium")],
                                [image.photographer]
                            ),
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                ["Format"]
                            ),
                            h.dd(
                                [h.Class("m-0 font-medium")],
                                [`${image.width} × ${image.height}`]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.selected_image_id === null) {
        return gallery(h)
    }

    const image = findGalleryImage(model.selected_image_id)
    return image === undefined ? gallery(h) : details(image, h)
}
