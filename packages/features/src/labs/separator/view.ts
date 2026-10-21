/** # Separator view */
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

export type SeparatorProps<Message> = Readonly<{
    orientation?: "horizontal" | "vertical"
    className?: string
    attributes?: ReadonlyArray<Attribute<Message>>
}>

export const Separator = <Message>(
    props: SeparatorProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const { div, Class, Role } = h
    const orientation = props.orientation ?? "horizontal"
    const defaultClassName =
        orientation === "horizontal"
            ? "h-px w-full bg-border"
            : "h-full w-px bg-border"

    return div(
        [
            ...(props.attributes ?? []),
            Role("separator"),
            Class(props.className ?? defaultClassName),
        ],
        []
    )
}

/**
 * Separators divide related regions without adding application state. The demo
 * combines horizontal and vertical orientations inside a compact content surface.
 */
export const view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Separator"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Horizontal and vertical separators in the foldkit/html style.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Top content"]
                            ),
                            Separator({ className: "w-full" }, h),
                            h.div(
                                [h.Class("flex items-center gap-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["Left"]
                                    ),
                                    Separator(
                                        {
                                            orientation: "vertical",
                                            className: "h-8",
                                        },
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["Right"]
                                    ),
                                ]
                            ),
                            Separator({ className: "w-full" }, h),
                            h.div(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Bottom content"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
