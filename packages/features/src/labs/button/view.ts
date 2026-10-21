/** # Button view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ClickedButton, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const buttonClassName =
    "inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-3 py-2 text-base font-semibold text-primary-foreground [box-shadow:var(--shadow-primary)] transition-colors hover:not-data-[disabled]:bg-primary-hover focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-offset-[var(--focus-outline-offset)] focus-visible:outline-ring data-[disabled]:cursor-not-allowed data-[disabled]:bg-secondary data-[disabled]:text-secondary-foreground data-[disabled]:opacity-100"

/**
 * The button emits a typed message and the update function records how many times
 * it has been activated. The disabled example uses the same headless component
 * without an activation message.
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
                ["Button"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("flex flex-col items-start gap-2")],
                [
                    Ui.Button.view(
                        {
                            onClick: toParentMessage(ClickedButton()),
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(buttonClassName),
                                    ],
                                    ["Click me"]
                                ),
                        },
                        h
                    ),
                    h.span(
                        [h.Class("text-sm tabular-nums text-muted-foreground")],
                        [
                            `Clicked ${model.clickCount} time${model.clickCount === 1 ? "" : "s"}`,
                        ]
                    ),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Disabled"]
            ),
            Ui.Button.view(
                {
                    isDisabled: true,
                    toView: (attributes) =>
                        h.button(
                            [...attributes.button, h.Class(buttonClassName)],
                            ["Disabled"]
                        ),
                },
                h
            ),
        ]
    )
}
