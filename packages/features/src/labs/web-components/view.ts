import { Array, Schema as S } from "effect"
import clsx from "clsx"
import { CustomElement } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button, Input } from "@foldkit/ui"

import "./element.ts"
import {
    ChangedWebComponentAccent,
    ChangedWebComponentRating,
    UpdatedWebComponentLabel,
    type WebComponentsMessage,
} from "./message.ts"

// The element is described once, in Schema. Properties are written by the
// runtime and diffed like any other prop; the event comes back as a Message.
export const ratingStars = CustomElement.define({
    tag: "urm-rating-stars",
    properties: {
        value: S.Number,
        max: S.Number,
        accent: S.String,
    },
    events: {
        "rating-changed": S.Struct({ rating: S.Number }),
    },
})

const MAX_RATING = 5

// Theme tokens rather than fixed hexes, so the stars track the active theme.
// The element renders into light DOM, so custom properties inherit into it and
// SVG fill/stroke resolve the `var()` against the page.
const PRESET_ACCENTS: ReadonlyArray<Readonly<{ name: string; value: string }>> =
    [
        { name: "Chart 1", value: "var(--chart-1)" },
        { name: "Chart 2", value: "var(--chart-2)" },
        { name: "Chart 3", value: "var(--chart-3)" },
        { name: "Chart 4", value: "var(--chart-4)" },
    ]

const FIELD_LABEL_CLASS =
    "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

const FIELD_CONTROL_CLASS =
    "px-3 py-2 text-sm rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background text-foreground outline-none focus:border-ring"

const swatchClass = (isActive: boolean): string =>
    clsx("w-5 h-5 rounded-full cursor-pointer transition", {
        "border-2 border-primary": isActive,
        "border-(length:--surface-border-width) border-border hover:border-ring":
            !isActive,
    })

const accentSwatches = <ParentMessage>(
    active: string,
    toWebComponentsMessage: (message: WebComponentsMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-1.5")],
        Array.map(PRESET_ACCENTS, ({ name, value }) =>
            Button.view(
                {
                    onClick: toWebComponentsMessage(
                        ChangedWebComponentAccent({ accent: value })
                    ),
                    toView: (attributes) =>
                        h.button([
                            ...attributes.button,
                            h.Title(name),
                            h.AriaLabel(`Use ${name}`),
                            h.Class(swatchClass(value === active)),
                            h.Style({ backgroundColor: value }),
                        ]),
                },
                h
            )
        )
    )

const labelFieldView = <ParentMessage>(
    label: string,
    toWebComponentsMessage: (message: WebComponentsMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Input.view(
        {
            id: "web-component-label",
            value: label,
            onInput: (value) =>
                toWebComponentsMessage(UpdatedWebComponentLabel({ value })),
            placeholder: "What is being rated",
            toView: (attributes) =>
                h.div(
                    [h.Class("flex flex-col gap-1.5")],
                    [
                        h.label(
                            [...attributes.label, h.Class(FIELD_LABEL_CLASS)],
                            ["Subject"]
                        ),
                        h.input([
                            ...attributes.input,
                            h.Class(FIELD_CONTROL_CLASS),
                        ]),
                    ]
                ),
        },
        h
    )

const starsView = <ParentMessage>(
    rating: number,
    accent: string,
    toWebComponentsMessage: (message: WebComponentsMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const stars = ratingStars.withMessage(h)

    return stars([
        stars.Value(rating),
        stars.Max(MAX_RATING),
        stars.Accent(accent),
        stars.OnRatingChanged(({ rating }) =>
            toWebComponentsMessage(ChangedWebComponentRating({ rating }))
        ),
        h.Class("inline-block"),
    ])
}

export const view = <ParentMessage>(
    label: string,
    rating: number,
    accent: string,
    toWebComponentsMessage: (message: WebComponentsMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Web components"]
            ),
            h.div(
                [
                    h.Class(
                        "max-w-xl bg-card text-card-foreground border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6 flex flex-col gap-5"
                    ),
                ],
                [
                    labelFieldView(label, toWebComponentsMessage, h),
                    h.div(
                        [h.Class("flex flex-col gap-1.5")],
                        [
                            h.span([h.Class(FIELD_LABEL_CLASS)], ["Rating"]),
                            starsView(
                                rating,
                                accent,
                                toWebComponentsMessage,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-col gap-1.5")],
                        [
                            h.span([h.Class(FIELD_LABEL_CLASS)], ["Accent"]),
                            accentSwatches(accent, toWebComponentsMessage, h),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            `${label || "Nothing"} rated ${rating} of ${MAX_RATING}.`,
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "The element and the swatches never speak to each other. Clicking a swatch writes the accent to the Model, and the runtime diffs it onto the element as a property; clicking a star dispatches a CustomEvent that arrives back as a Message.",
                        ]
                    ),
                ]
            ),
        ]
    )
