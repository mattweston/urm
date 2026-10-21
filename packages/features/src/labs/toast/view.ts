/** # Toast view */
import { Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { EntryHandlers, Variant } from "@foldkit/ui/toast"

import * as Icon from "../_shared/icon.ts"
import {
    ClickedDismissAllToasts,
    ClickedShowErrorToast,
    ClickedShowInfoToast,
    ClickedShowStickyToast,
    ClickedShowSuccessToast,
    ClickedShowWarningToast,
    GotToastDemoMessage,
    type ToastDemoMessage,
} from "./message.ts"
import { Toast } from "./toast.ts"

type Entry = typeof Toast.Entry.Type

const variantClassName = (variant: Variant): string =>
    M.value(variant).pipe(
        M.when("Info", () => "border-border bg-card text-card-foreground"),
        M.when(
            "Success",
            () => "border-border bg-secondary text-secondary-foreground"
        ),
        M.when(
            "Warning",
            () => "border-border bg-accent text-accent-foreground"
        ),
        M.when(
            "Error",
            () => "border-border bg-destructive text-destructive-foreground"
        ),
        M.exhaustive
    )

const entryClassName = "w-80"

const renderToastEntry = <ParentMessage>(
    entry: Entry,
    handlers: EntryHandlers,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                `relative rounded-lg border shadow-sm p-3 pr-9 ${variantClassName(entry.variant)}`
            ),
        ],
        [
            h.p([h.Class("font-semibold text-sm")], [entry.payload.title]),
            ...Option.match(entry.payload.maybeDescription, {
                onNone: () => [],
                onSome: (description) => [
                    h.p(
                        [h.Class("text-sm text-muted-foreground mt-0.5")],
                        [description]
                    ),
                ],
            }),
            h.button(
                [
                    h.Class(
                        "absolute top-2 right-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-md p-1 transition-colors"
                    ),
                    ...handlers.dismiss,
                ],
                [Icon.xMark("w-4 h-4")]
            ),
        ]
    )
}

const demoButtonClassName =
    "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

/**
 * Create informational, success, warning, error, and sticky notifications.
 * Transient entries dismiss through runtime commands, hovering pauses their
 * timers, and the stack can also be cleared explicitly.
 */
export const view = <ParentMessage>(
    toastModel: typeof Toast.Model.Type,
    toToastDemoMessage: (message: ToastDemoMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-2")],
                ["Toast"]
            ),
            h.p(
                [h.Class("text-muted-foreground mb-6 max-w-prose")],
                [
                    "A stack of transient notifications that auto-dismiss. Hover over a toast to pause its timer.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Variants"]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedShowInfoToast())
                            ),
                        ],
                        ["Info"]
                    ),
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedShowSuccessToast())
                            ),
                        ],
                        ["Success"]
                    ),
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedShowWarningToast())
                            ),
                        ],
                        ["Warning"]
                    ),
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedShowErrorToast())
                            ),
                        ],
                        ["Error"]
                    ),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Sticky"]
            ),
            h.p(
                [h.Class("text-muted-foreground mb-4 max-w-prose")],
                [
                    "Pass ",
                    h.span(
                        [h.Class("font-mono text-sm bg-muted px-1 rounded")],
                        ["sticky: true"]
                    ),
                    " to skip the auto-dismiss timer. The user must close it manually.",
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedShowStickyToast())
                            ),
                        ],
                        ["Show sticky toast"]
                    ),
                    h.button(
                        [
                            h.Class(demoButtonClassName),
                            h.OnClick(
                                toToastDemoMessage(ClickedDismissAllToasts())
                            ),
                        ],
                        ["Dismiss all"]
                    ),
                ]
            ),

            h.submodel({
                slotId: toastModel.id,
                model: toastModel,
                view: Toast.view,
                viewInputs: {
                    position: "BottomRight",
                    entryToView: (entry, handlers) =>
                        renderToastEntry<ParentMessage>(entry, handlers, h),
                    entryClassName,
                },
                toParentMessage: (message) =>
                    toToastDemoMessage(GotToastDemoMessage({ message })),
            }),
        ]
    )
}
