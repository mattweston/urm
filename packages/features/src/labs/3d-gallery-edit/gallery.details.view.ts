import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { GalleryText } from "./images.ts"
import { frames, getGalleryText } from "./images.ts"
import type { Message } from "./gallery.message.ts"
import { ChangedGalleryText } from "./gallery.message.ts"
import { artwork_image_transition_style } from "./gallery.transition.ts"

export const detailsView = <ParentMessage>(
    frameKey: string,
    maybeOverrideUrl: Option.Option<string>,
    maybeTextOverride: Option.Option<GalleryText>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    back_href: string,
    back_message: Message,
    transition_image = false
): Html => {
    const frame = frames.find((frameDef) => frameDef.key === frameKey)
    const defaultText = getGalleryText(frameKey)

    if (frame === undefined || defaultText === undefined) {
        return h.div(
            [
                h.Class(
                    "flex min-h-[50vh] items-center justify-center text-muted-foreground"
                ),
            ],
            ["Image not found"]
        )
    }

    const imageUrl = Option.match(maybeOverrideUrl, {
        onNone: () => frame.url,
        onSome: (overrideUrl) => overrideUrl,
    })
    const text = Option.getOrElse(maybeTextOverride, () => defaultText)

    return h.div(
        [h.Class("mx-auto max-w-3xl space-y-6 px-4 py-8")],
        [
            h.a(
                [
                    h.Class(
                        "inline-flex w-fit items-center gap-1 rounded-[var(--radius-control)] px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground [box-shadow:var(--shadow-control)]"
                    ),
                    h.Attribute("href", back_href),
                    h.OnClick(toParentMessage(back_message)),
                ],
                ["← Back to gallery"]
            ),
            h.img([
                h.Class(
                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border [box-shadow:var(--shadow-surface)]"
                ),
                h.Attribute("src", imageUrl),
                h.Attribute("alt", text.title),
                ...(transition_image
                    ? [h.Style(artwork_image_transition_style(frameKey))]
                    : []),
            ]),
            h.div(
                [h.Class("mt-6 space-y-4")],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-2xl font-semibold text-foreground"
                                    ),
                                ],
                                ["Edit artwork details"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Changes remain in this browser session."]
                            ),
                        ]
                    ),
                    textInput(
                        "Title",
                        "title",
                        text.title,
                        frameKey,
                        toParentMessage,
                        h
                    ),
                    textInput(
                        "Artist",
                        "artist",
                        text.artist,
                        frameKey,
                        toParentMessage,
                        h
                    ),
                    h.div(
                        [h.Class("grid grid-cols-1 gap-4 sm:grid-cols-2")],
                        [
                            textInput(
                                "Year",
                                "year",
                                text.year,
                                frameKey,
                                toParentMessage,
                                h
                            ),
                            textInput(
                                "Medium",
                                "medium",
                                text.medium,
                                frameKey,
                                toParentMessage,
                                h
                            ),
                            textInput(
                                "Dimensions",
                                "dimensions",
                                text.dimensions,
                                frameKey,
                                toParentMessage,
                                h
                            ),
                            textInput(
                                "Price",
                                "price",
                                text.price,
                                frameKey,
                                toParentMessage,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label(
                                [
                                    h.For(`gallery-description-${frameKey}`),
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["About"]
                            ),
                            h.textarea([
                                h.Id(`gallery-description-${frameKey}`),
                                h.Attribute("rows", "6"),
                                h.Value(text.description),
                                h.Class(
                                    "min-h-36 w-full resize-y rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        ChangedGalleryText({
                                            frameKey,
                                            field: "description",
                                            value,
                                        })
                                    )
                                ),
                            ]),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const textInput = <ParentMessage>(
    label: string,
    field: "title" | "artist" | "year" | "medium" | "dimensions" | "price",
    value: string,
    frameKey: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const id = `gallery-${field}-${frameKey}`

    return h.div(
        [h.Class("space-y-2")],
        [
            h.label(
                [h.For(id), h.Class("text-sm font-medium text-foreground")],
                [label]
            ),
            h.input([
                h.Id(id),
                h.Value(value),
                h.Class(
                    "w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                ),
                h.OnInput((nextValue) =>
                    toParentMessage(
                        ChangedGalleryText({
                            frameKey,
                            field,
                            value: nextValue,
                        })
                    )
                ),
            ]),
        ]
    )
}
