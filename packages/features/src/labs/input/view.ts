/** # Input view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { UpdatedValue, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const inputClassName =
    "block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const labelClassName = "block text-sm font-medium text-foreground"

const descriptionClassName = "text-sm text-muted-foreground"

/**
 * The input value lives in the standalone lab model and changes through typed
 * input messages. The rendered label and description remain connected to the
 * control through the headless component's attributes.
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
                ["Input"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("flex flex-col items-start gap-2 max-w-sm")],
                [
                    Ui.Input.view(
                        {
                            id: "input-basic-demo",
                            value: model.value,
                            onInput: (value) =>
                                toParentMessage(UpdatedValue({ value })),
                            placeholder: "Enter your full name",
                            toView: (attributes) =>
                                h.div(
                                    [h.Class("flex flex-col gap-1.5 w-full")],
                                    [
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class(labelClassName),
                                            ],
                                            ["Name"]
                                        ),
                                        h.input([
                                            ...attributes.input,
                                            h.Class(inputClassName),
                                        ]),
                                        h.span(
                                            [
                                                ...attributes.description,
                                                h.Class(descriptionClassName),
                                            ],
                                            [
                                                "As it appears on your government-issued ID.",
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Disabled"]
            ),
            Ui.Input.view(
                {
                    id: "input-disabled-demo",
                    isDisabled: true,
                    value: "Ada Lovelace",
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1.5 max-w-sm")],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(labelClassName),
                                    ],
                                    ["Name"]
                                ),
                                h.input([
                                    ...attributes.input,
                                    h.Class(inputClassName),
                                ]),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(descriptionClassName),
                                    ],
                                    ["This input is disabled."]
                                ),
                            ]
                        ),
                },
                h
            ),
        ]
    )
}
