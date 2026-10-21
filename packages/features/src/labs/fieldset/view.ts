/** # Fieldset view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ToggledCheckbox,
    UpdatedInputValue,
    UpdatedTextareaValue,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const fieldsetClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-6 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"

const legendClassName =
    "float-left w-full text-base font-semibold text-foreground"

const descriptionClassName = "text-sm text-muted-foreground"

const labelClassName = "block text-sm font-medium text-foreground"

const inputClassName =
    "block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const textareaClassName =
    "block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2.5 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const checkboxLabelClassName =
    "text-sm font-normal text-foreground cursor-pointer select-none"

const checkboxDescriptionClassName = "text-sm text-muted-foreground"

/**
 * Toggle preferences within a semantic fieldset. The legend describes the
 * group, while each checkbox sends a typed message that updates one field in
 * the example model.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const checkmark = h.span(
        [h.Class("text-primary-foreground text-xs")],
        ["✓"]
    )

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Fieldset"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            Ui.Fieldset.view(
                {
                    id: "fieldset-basic-demo",
                    toView: (attributes) =>
                        h.fieldset(
                            [
                                ...attributes.fieldset,
                                h.Class(fieldsetClassName),
                            ],
                            [
                                h.legend(
                                    [
                                        ...attributes.legend,
                                        h.Class(legendClassName),
                                    ],
                                    ["Personal Information"]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(`${descriptionClassName} mt-1`),
                                    ],
                                    ["We just need a few details."]
                                ),
                                h.div(
                                    [h.Class("mt-4 flex flex-col gap-4")],
                                    [
                                        Ui.Input.view(
                                            {
                                                id: "fieldset-name-input",
                                                value: model.inputValue,
                                                onInput: (value) =>
                                                    toParentMessage(
                                                        UpdatedInputValue({
                                                            value,
                                                        })
                                                    ),
                                                placeholder:
                                                    "Enter your full name",
                                                toView: (inputAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-col gap-1.5"
                                                            ),
                                                        ],
                                                        [
                                                            h.label(
                                                                [
                                                                    ...inputAttributes.label,
                                                                    h.Class(
                                                                        labelClassName
                                                                    ),
                                                                ],
                                                                ["Name"]
                                                            ),
                                                            h.input([
                                                                ...inputAttributes.input,
                                                                h.Class(
                                                                    inputClassName
                                                                ),
                                                            ]),
                                                            h.span(
                                                                [
                                                                    ...inputAttributes.description,
                                                                    h.Class(
                                                                        descriptionClassName
                                                                    ),
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
                                        Ui.Textarea.view(
                                            {
                                                id: "fieldset-bio-textarea",
                                                value: model.textareaValue,
                                                onInput: (value) =>
                                                    toParentMessage(
                                                        UpdatedTextareaValue({
                                                            value,
                                                        })
                                                    ),
                                                placeholder:
                                                    "Tell us about yourself...",
                                                rows: 3,
                                                toView: (textareaAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-col gap-1.5"
                                                            ),
                                                        ],
                                                        [
                                                            h.label(
                                                                [
                                                                    ...textareaAttributes.label,
                                                                    h.Class(
                                                                        labelClassName
                                                                    ),
                                                                ],
                                                                ["Bio"]
                                                            ),
                                                            h.textarea([
                                                                ...textareaAttributes.textarea,
                                                                h.Class(
                                                                    textareaClassName
                                                                ),
                                                            ]),
                                                            h.span(
                                                                [
                                                                    ...textareaAttributes.description,
                                                                    h.Class(
                                                                        descriptionClassName
                                                                    ),
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
                                        Ui.Checkbox.view(
                                            {
                                                id: "fieldset-checkbox-demo",
                                                isChecked: model.checkbox,
                                                onToggle: (isChecked) =>
                                                    toParentMessage(
                                                        ToggledCheckbox({
                                                            isChecked,
                                                        })
                                                    ),
                                                toView: (checkboxAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-col gap-1"
                                                            ),
                                                        ],
                                                        [
                                                            h.div(
                                                                [
                                                                    h.Class(
                                                                        "flex items-center gap-2"
                                                                    ),
                                                                ],
                                                                [
                                                                    h.button(
                                                                        [
                                                                            ...checkboxAttributes.checkbox,
                                                                            h.Class(
                                                                                checkboxClassName
                                                                            ),
                                                                        ],
                                                                        model.checkbox
                                                                            ? [
                                                                                  checkmark,
                                                                              ]
                                                                            : []
                                                                    ),
                                                                    h.label(
                                                                        [
                                                                            ...checkboxAttributes.label,
                                                                            h.Class(
                                                                                checkboxLabelClassName
                                                                            ),
                                                                        ],
                                                                        [
                                                                            "I agree to the terms and conditions",
                                                                        ]
                                                                    ),
                                                                ]
                                                            ),
                                                            h.p(
                                                                [
                                                                    ...checkboxAttributes.description,
                                                                    h.Class(
                                                                        checkboxDescriptionClassName
                                                                    ),
                                                                ],
                                                                [
                                                                    "You agree to our Terms of Service and Privacy Policy.",
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
                        ),
                },
                h
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Disabled"]
            ),
            Ui.Fieldset.view(
                {
                    id: "fieldset-disabled-demo",
                    isDisabled: true,
                    toView: (attributes) =>
                        h.fieldset(
                            [
                                ...attributes.fieldset,
                                h.Class(fieldsetClassName),
                            ],
                            [
                                h.legend(
                                    [
                                        ...attributes.legend,
                                        h.Class(legendClassName),
                                    ],
                                    ["Personal Information"]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(`${descriptionClassName} mt-1`),
                                    ],
                                    ["This fieldset is disabled."]
                                ),
                                h.div(
                                    [h.Class("mt-4 flex flex-col gap-4")],
                                    [
                                        Ui.Input.view(
                                            {
                                                id: "fieldset-disabled-name-input",
                                                isDisabled: true,
                                                value: "Ada Lovelace",
                                                toView: (inputAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-col gap-1.5"
                                                            ),
                                                        ],
                                                        [
                                                            h.label(
                                                                [
                                                                    ...inputAttributes.label,
                                                                    h.Class(
                                                                        labelClassName
                                                                    ),
                                                                ],
                                                                ["Name"]
                                                            ),
                                                            h.input([
                                                                ...inputAttributes.input,
                                                                h.Class(
                                                                    inputClassName
                                                                ),
                                                            ]),
                                                        ]
                                                    ),
                                            },
                                            h
                                        ),
                                        Ui.Textarea.view(
                                            {
                                                id: "fieldset-disabled-bio-textarea",
                                                isDisabled: true,
                                                value: "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
                                                rows: 3,
                                                toView: (textareaAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-col gap-1.5"
                                                            ),
                                                        ],
                                                        [
                                                            h.label(
                                                                [
                                                                    ...textareaAttributes.label,
                                                                    h.Class(
                                                                        labelClassName
                                                                    ),
                                                                ],
                                                                ["Bio"]
                                                            ),
                                                            h.textarea([
                                                                ...textareaAttributes.textarea,
                                                                h.Class(
                                                                    textareaClassName
                                                                ),
                                                            ]),
                                                        ]
                                                    ),
                                            },
                                            h
                                        ),
                                        Ui.Checkbox.view(
                                            {
                                                id: "fieldset-disabled-checkbox",
                                                isChecked: true,
                                                onToggle: (isChecked) =>
                                                    toParentMessage(
                                                        ToggledCheckbox({
                                                            isChecked,
                                                        })
                                                    ),
                                                isDisabled: true,
                                                toView: (checkboxAttributes) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex items-center gap-2"
                                                            ),
                                                        ],
                                                        [
                                                            h.button(
                                                                [
                                                                    ...checkboxAttributes.checkbox,
                                                                    h.Class(
                                                                        checkboxClassName
                                                                    ),
                                                                ],
                                                                [checkmark]
                                                            ),
                                                            h.label(
                                                                [
                                                                    ...checkboxAttributes.label,
                                                                    h.Class(
                                                                        checkboxLabelClassName
                                                                    ),
                                                                ],
                                                                [
                                                                    "I agree to the terms and conditions",
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
                        ),
                },
                h
            ),
        ]
    )
}
