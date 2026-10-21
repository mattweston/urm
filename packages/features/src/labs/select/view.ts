/** # Select view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import { UpdatedValue, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const selectClassName =
    "appearance-none inline-flex items-center gap-2 w-full px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [box-shadow:var(--shadow-control)]"

const selectWrapperClassName = "relative w-full"

const chevronClassName =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"

const labelClassName = "block text-sm font-medium text-foreground"

const descriptionClassName = "text-sm text-muted-foreground"

/**
 * The selected country is controlled by the standalone lab model. The view keeps
 * native select behavior while applying the shared theme and connecting its label
 * and supporting description.
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
                ["Select"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("flex flex-col items-start gap-2 max-w-sm")],
                [
                    Ui.Select.view(
                        {
                            id: "select-basic-demo",
                            value: model.value,
                            onChange: (value) =>
                                toParentMessage(UpdatedValue({ value })),
                            toView: (attributes) =>
                                h.div(
                                    [h.Class("flex flex-col gap-1.5 w-full")],
                                    [
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class(labelClassName),
                                            ],
                                            ["Country"]
                                        ),
                                        h.div(
                                            [h.Class(selectWrapperClassName)],
                                            [
                                                h.select(
                                                    [
                                                        ...attributes.select,
                                                        h.Class(
                                                            selectClassName
                                                        ),
                                                    ],
                                                    [
                                                        h.option(
                                                            [h.Value("us")],
                                                            ["United States"]
                                                        ),
                                                        h.option(
                                                            [h.Value("ca")],
                                                            ["Canada"]
                                                        ),
                                                        h.option(
                                                            [h.Value("gb")],
                                                            ["United Kingdom"]
                                                        ),
                                                        h.option(
                                                            [h.Value("au")],
                                                            ["Australia"]
                                                        ),
                                                    ]
                                                ),
                                                h.span(
                                                    [h.Class(chevronClassName)],
                                                    [
                                                        Icon.chevronDown(
                                                            "w-4 h-4"
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.span(
                                            [
                                                ...attributes.description,
                                                h.Class(descriptionClassName),
                                            ],
                                            ["Where you currently reside."]
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
            Ui.Select.view(
                {
                    id: "select-disabled-demo",
                    isDisabled: true,
                    value: "us",
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1.5 max-w-sm")],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(labelClassName),
                                    ],
                                    ["Country"]
                                ),
                                h.div(
                                    [h.Class(selectWrapperClassName)],
                                    [
                                        h.select(
                                            [
                                                ...attributes.select,
                                                h.Class(selectClassName),
                                            ],
                                            [
                                                h.option(
                                                    [h.Value("us")],
                                                    ["United States"]
                                                ),
                                                h.option(
                                                    [h.Value("ca")],
                                                    ["Canada"]
                                                ),
                                                h.option(
                                                    [h.Value("gb")],
                                                    ["United Kingdom"]
                                                ),
                                                h.option(
                                                    [h.Value("au")],
                                                    ["Australia"]
                                                ),
                                            ]
                                        ),
                                        h.span(
                                            [h.Class(chevronClassName)],
                                            [Icon.chevronDown("w-4 h-4")]
                                        ),
                                    ]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(descriptionClassName),
                                    ],
                                    ["This select is disabled."]
                                ),
                            ]
                        ),
                },
                h
            ),
        ]
    )
}
