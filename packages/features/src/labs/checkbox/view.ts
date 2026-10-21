/** # Checkbox view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ToggledAll,
    ToggledBasic,
    ToggledOptionA,
    ToggledOptionB,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const topRowClassName = "flex items-center gap-2"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const labelClassName =
    "text-sm font-normal text-foreground cursor-pointer select-none"

const descriptionClassName = "text-sm text-muted-foreground"

/**
 * These controlled checkboxes keep their values in the lab model. The parent
 * checkbox derives its checked and indeterminate states from the two notification
 * options.
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
                ["Checkbox"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            Ui.Checkbox.view(
                {
                    id: "checkbox-basic-demo",
                    isChecked: model.basic,
                    onToggle: (isChecked) =>
                        toParentMessage(ToggledBasic({ isChecked })),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1")],
                            [
                                h.div(
                                    [h.Class(topRowClassName)],
                                    [
                                        h.button(
                                            [
                                                ...attributes.checkbox,
                                                h.Class(checkboxClassName),
                                            ],
                                            model.basic ? [checkmark] : []
                                        ),
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class(labelClassName),
                                            ],
                                            ["Accept terms and conditions"]
                                        ),
                                    ]
                                ),
                                h.p(
                                    [
                                        ...attributes.description,
                                        h.Class(descriptionClassName),
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

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Indeterminate"]
            ),
            ...indeterminateDemo<ParentMessage>(model, toParentMessage, h),
        ]
    )
}

const indeterminateDemo = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => {
    const checkmark = h.span(
        [h.Class("text-primary-foreground text-xs")],
        ["✓"]
    )
    const indeterminateMark = h.span(
        [h.Class("text-primary-foreground text-xs")],
        ["—"]
    )

    const isAllChecked = model.optionA && model.optionB
    const isNoneChecked = !model.optionA && !model.optionB
    const isIndeterminate = !isAllChecked && !isNoneChecked

    const selectAllMark = isIndeterminate
        ? indeterminateMark
        : isAllChecked
          ? checkmark
          : undefined

    return [
        h.div(
            [h.Class("flex flex-col gap-3")],
            [
                Ui.Checkbox.view(
                    {
                        id: "checkbox-all-demo",
                        isChecked: isAllChecked,
                        isIndeterminate,
                        onToggle: (isChecked) =>
                            toParentMessage(ToggledAll({ isChecked })),
                        toView: (attributes) =>
                            h.div(
                                [h.Class(topRowClassName)],
                                [
                                    h.button(
                                        [
                                            ...attributes.checkbox,
                                            h.Class(checkboxClassName),
                                        ],
                                        selectAllMark ? [selectAllMark] : []
                                    ),
                                    h.label(
                                        [
                                            ...attributes.label,
                                            h.Class(labelClassName),
                                        ],
                                        ["All notifications"]
                                    ),
                                ]
                            ),
                    },
                    h
                ),
                h.div(
                    [h.Class("ml-7 flex flex-col gap-3")],
                    [
                        Ui.Checkbox.view(
                            {
                                id: "checkbox-option-a-demo",
                                isChecked: model.optionA,
                                onToggle: (isChecked) =>
                                    toParentMessage(
                                        ToggledOptionA({
                                            isChecked,
                                        })
                                    ),
                                toView: (attributes) =>
                                    h.div(
                                        [h.Class(topRowClassName)],
                                        [
                                            h.button(
                                                [
                                                    ...attributes.checkbox,
                                                    h.Class(checkboxClassName),
                                                ],
                                                model.optionA ? [checkmark] : []
                                            ),
                                            h.label(
                                                [
                                                    ...attributes.label,
                                                    h.Class(labelClassName),
                                                ],
                                                ["Email notifications"]
                                            ),
                                        ]
                                    ),
                            },
                            h
                        ),
                        Ui.Checkbox.view(
                            {
                                id: "checkbox-option-b-demo",
                                isChecked: model.optionB,
                                onToggle: (isChecked) =>
                                    toParentMessage(
                                        ToggledOptionB({
                                            isChecked,
                                        })
                                    ),
                                toView: (attributes) =>
                                    h.div(
                                        [h.Class(topRowClassName)],
                                        [
                                            h.button(
                                                [
                                                    ...attributes.checkbox,
                                                    h.Class(checkboxClassName),
                                                ],
                                                model.optionB ? [checkmark] : []
                                            ),
                                            h.label(
                                                [
                                                    ...attributes.label,
                                                    h.Class(labelClassName),
                                                ],
                                                ["Push notifications"]
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
    ]
}
