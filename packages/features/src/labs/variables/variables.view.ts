/** # Variables view */
import { inertHtml } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import { derive, ranges } from "./variables.derive.ts"
import type { Message } from "./variables.message.ts"
import type { Model } from "./variables.model.ts"
import {
    badge,
    bar,
    booleanBlock,
    dots,
    rectangle,
    textBlock,
    variableBlock,
} from "./widgets/index.ts"

type ToParent<ParentMessage> = (message: Message) => ParentMessage

const readingClassName =
    "grid gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"

const readingLabel = (text: string): Html => {
    const h = inertHtml

    return h.span(
        [
            h.Class(
                "font-mono text-xs uppercase tracking-wide text-muted-foreground"
            ),
        ],
        [text]
    )
}

/** One variable, one control, nothing else on screen to explain it away. */
export const countBlockView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    variableBlock(
        { variable: "count", value: model.count, note: "a whole number" },
        toParentMessage,
        h
    )

/** The same variable read four ways, so it is clear there is only one of it. */
export const readingsView = (model: Model): Html => {
    const h = inertHtml
    const range = ranges.count

    return h.div(
        [h.Class("grid gap-3 sm:grid-cols-2")],
        [
            h.div(
                [h.Class(readingClassName)],
                [
                    readingLabel("as a number"),
                    h.span(
                        [
                            h.Class(
                                "font-mono text-3xl tabular-nums text-foreground"
                            ),
                        ],
                        [String(model.count)]
                    ),
                ]
            ),
            h.div(
                [h.Class(readingClassName)],
                [
                    readingLabel("as that many things"),
                    dots({ value: model.count, label: "count" }),
                ]
            ),
            h.div(
                [h.Class(readingClassName)],
                [
                    readingLabel("as a length"),
                    bar({
                        value: model.count,
                        maximum: range.maximum,
                        label: "count",
                    }),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [`out of ${range.maximum}`]
                    ),
                ]
            ),
            h.div(
                [h.Class(readingClassName)],
                [
                    readingLabel("as a sentence"),
                    h.p(
                        [h.Class("text-foreground")],
                        [
                            model.count === 1
                                ? "There is 1 contact in this workspace."
                                : `There are ${model.count} contacts in this workspace.`,
                        ]
                    ),
                ]
            ),
        ]
    )
}

/** Two variables, and a third value that is not stored anywhere. */
export const rectangleView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const derived = derive(model)

    return h.div(
        [h.Class("grid gap-4")],
        [
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2")],
                [
                    variableBlock(
                        {
                            variable: "width",
                            value: model.width,
                            note: "columns",
                        },
                        toParentMessage,
                        h
                    ),
                    variableBlock(
                        {
                            variable: "height",
                            value: model.height,
                            note: "rows",
                        },
                        toParentMessage,
                        h
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30 p-5"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-baseline gap-x-6 gap-y-2"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "font-mono text-sm text-muted-foreground"
                                    ),
                                ],
                                ["area = width × height"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "font-mono text-3xl tabular-nums text-foreground"
                                    ),
                                ],
                                [String(derived.area)]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "font-mono text-sm text-muted-foreground"
                                    ),
                                ],
                                [`perimeter ${derived.perimeter}`]
                            ),
                            badge({
                                isOn: derived.isSquare,
                                text: derived.isSquare
                                    ? "square"
                                    : "not square",
                            }),
                        ]
                    ),
                    rectangle({
                        width: model.width,
                        height: model.height,
                        isSquare: derived.isSquare,
                    }),
                ]
            ),
        ]
    )
}

/** Variables that hold text and truth, and what falls out of them. */
export const textAndBooleanView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const derived = derive(model)

    return h.div(
        [h.Class("grid gap-4")],
        [
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2")],
                [
                    textBlock(
                        { value: model.workspaceName, note: "text" },
                        toParentMessage,
                        h
                    ),
                    booleanBlock(
                        { value: model.isPublished, note: "true or false" },
                        toParentMessage,
                        h
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30 p-5"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-3")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "font-mono text-sm text-muted-foreground"
                                    ),
                                ],
                                ["slug"]
                            ),
                            h.span(
                                [h.Class("font-mono text-lg text-foreground")],
                                [
                                    derived.slug === ""
                                        ? "—"
                                        : `/${derived.slug}/`,
                                ]
                            ),
                            badge({
                                isOn: model.isPublished,
                                text: derived.status,
                            }),
                        ]
                    ),
                    h.p(
                        [h.Class("text-foreground")],
                        [
                            model.workspaceName.trim() === ""
                                ? "An unnamed workspace has no address to publish to."
                                : `${model.workspaceName} is ${model.isPublished ? "live" : "still a draft"}, with ${model.count} ${model.count === 1 ? "contact" : "contacts"}.`,
                        ]
                    ),
                ]
            ),
        ]
    )
}

/**
 * Change numeric dimensions, a workspace name, and publication state. Every
 * displayed calculation is derived from those model fields, keeping source
 * values and computed presentation distinct.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("grid gap-8")],
        [
            countBlockView(model, toParentMessage, h),
            readingsView(model),
            rectangleView(model, toParentMessage, h),
            textAndBooleanView(model, toParentMessage, h),
        ]
    )
}
