/** # Textarea view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { UpdatedValue, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const textareaClassName =
    "block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2.5 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const labelClassName = "block text-sm font-medium text-foreground"

const descriptionClassName = "text-sm text-muted-foreground"

/**
 * The textarea sends its current value through typed input messages and keeps the
 * model as the source of truth. A second example demonstrates the disabled state.
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
                ["Textarea"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("flex flex-col items-start gap-2 max-w-sm")],
                [
                    Ui.Textarea.view(
                        {
                            id: "textarea-basic-demo",
                            value: model.value,
                            onInput: (value) =>
                                toParentMessage(UpdatedValue({ value })),
                            placeholder: "Tell us about yourself...",
                            rows: 4,
                            toView: (attributes) =>
                                h.div(
                                    [h.Class("flex flex-col gap-1.5 w-full")],
                                    [
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class(labelClassName),
                                            ],
                                            ["Bio"]
                                        ),
                                        h.textarea([
                                            ...attributes.textarea,
                                            h.Class(textareaClassName),
                                        ]),
                                        h.span(
                                            [
                                                ...attributes.description,
                                                h.Class(descriptionClassName),
                                            ],
                                            [
                                                "A brief introduction about yourself.",
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
            Ui.Textarea.view(
                {
                    id: "textarea-disabled-demo",
                    isDisabled: true,
                    value: "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
                    rows: 3,
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1.5 max-w-sm")],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(labelClassName),
                                    ],
                                    ["Bio"]
                                ),
                                h.textarea([
                                    ...attributes.textarea,
                                    h.Class(textareaClassName),
                                ]),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(descriptionClassName),
                                    ],
                                    ["This textarea is disabled."]
                                ),
                            ]
                        ),
                },
                h
            ),
        ]
    )
}
