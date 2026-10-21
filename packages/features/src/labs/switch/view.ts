/** # Switch view */
import clsx from "clsx"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledChecked, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const wrapperClassName = "flex items-center gap-3"

const buttonClassName =
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-muted data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"

const labelClassName =
    "text-sm font-normal text-foreground cursor-pointer select-none"

const descriptionClassName = "text-sm text-muted-foreground"

const knob = <ParentMessage>(
    isChecked: boolean,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.span(
        [
            h.Class(
                clsx(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
                    isChecked ? "translate-x-6" : "translate-x-1"
                )
            ),
        ],
        []
    )
}

/**
 * The switch stores its checked state in the lab model. Its trigger, label, and
 * description are connected by the headless component while the view owns the
 * visual treatment.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Switch"]
            ),
            h.div(
                [h.Class("mt-4")],
                [
                    Ui.Switch.view(
                        {
                            id: "switch-demo",
                            isChecked: model.checked,
                            onToggle: (isChecked) =>
                                toParentMessage(ToggledChecked({ isChecked })),
                            toView: (attributes) =>
                                h.div(
                                    [h.Class(wrapperClassName)],
                                    [
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(buttonClassName),
                                            ],
                                            [
                                                knob<ParentMessage>(
                                                    model.checked,
                                                    h
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [],
                                            [
                                                h.label(
                                                    [
                                                        ...attributes.label,
                                                        h.Class(labelClassName),
                                                    ],
                                                    ["Enable notifications"]
                                                ),
                                                h.p(
                                                    [
                                                        ...attributes.description,
                                                        h.Class(
                                                            descriptionClassName
                                                        ),
                                                    ],
                                                    [
                                                        "Get notified when something important happens.",
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}
