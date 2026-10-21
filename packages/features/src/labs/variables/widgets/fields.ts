import type { Html, HtmlBuilder } from "foldkit/html"

import { ChangedWorkspaceName, ToggledPublished } from "../variables.message.ts"

const blockClassName =
    "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"

const headerClassName = "flex items-baseline justify-between gap-4"

const nameClassName = "font-mono text-sm text-foreground"

const noteClassName = "text-xs text-muted-foreground"

const inputClassName = [
    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2",
    "font-mono text-lg text-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
].join(" ")

/** A variable that is not a number, given the same treatment as one that is. */
export const textBlock = <ParentMessage>(
    args: Readonly<{ value: string; note: string }>,
    toParentMessage: (
        message: typeof ChangedWorkspaceName.Type
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class(blockClassName)],
        [
            h.div(
                [h.Class(headerClassName)],
                [
                    h.span([h.Class(nameClassName)], ["workspaceName"]),
                    h.span([h.Class(noteClassName)], [args.note]),
                ]
            ),
            h.input([
                h.Class(inputClassName),
                h.Type("text"),
                h.Value(args.value),
                h.AriaLabel("Workspace name"),
                h.Placeholder("Name this workspace"),
                h.OnInput((workspaceName) =>
                    toParentMessage(ChangedWorkspaceName({ workspaceName }))
                ),
            ]),
        ]
    )
}

const switchClassName = [
    "inline-flex h-7 w-12 items-center rounded-full border-(length:--surface-border-width) border-border p-0.5",
    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
].join(" ")

/** A variable with only two values, shown as the switch it really is. */
export const booleanBlock = <ParentMessage>(
    args: Readonly<{ value: boolean; note: string }>,
    toParentMessage: (message: typeof ToggledPublished.Type) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class(blockClassName)],
        [
            h.div(
                [h.Class(headerClassName)],
                [
                    h.span([h.Class(nameClassName)], ["isPublished"]),
                    h.span([h.Class(noteClassName)], [args.note]),
                ]
            ),
            h.div(
                [h.Class("flex items-center gap-3")],
                [
                    h.button(
                        [
                            h.Class(
                                args.value
                                    ? `${switchClassName} bg-primary`
                                    : `${switchClassName} bg-muted`
                            ),
                            h.Type("button"),
                            h.Role("switch"),
                            h.Attribute("aria-checked", String(args.value)),
                            h.AriaLabel("Published"),
                            h.OnClick(toParentMessage(ToggledPublished())),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        args.value
                                            ? "size-5 translate-x-5 rounded-full bg-primary-foreground transition-transform"
                                            : "size-5 translate-x-0 rounded-full bg-foreground/60 transition-transform"
                                    ),
                                ],
                                []
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class("font-mono text-lg text-foreground")],
                        [String(args.value)]
                    ),
                ]
            ),
        ]
    )
}
