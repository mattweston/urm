/** # Radio Group view */
import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    SelectedHorizontal,
    SelectedVertical,
    type Message,
} from "./message.ts"
import { radioGroupView } from "./controlled.ts"

type Plan = "Startup" | "Business" | "Enterprise"

const plans: ReadonlyArray<Plan> = ["Startup", "Business", "Enterprise"]

const planDescriptions: Record<Plan, string> = {
    Startup: "12GB / 6 CPUs — Perfect for small projects",
    Business: "16GB / 8 CPUs — For growing teams",
    Enterprise: "32GB / 12 CPUs — Dedicated infrastructure",
}

const planPrices: Record<Plan, string> = {
    Startup: "$40/mo",
    Business: "$80/mo",
    Enterprise: "$160/mo",
}

const verticalGroupClassName = "flex flex-col gap-3 w-full"

const verticalOptionClassName =
    "relative flex cursor-pointer rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 transition-colors hover:bg-accent data-[checked]:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

const horizontalGroupClassName = "flex flex-col sm:flex-row gap-3 w-full"

const horizontalOptionClassName =
    "relative flex flex-1 cursor-pointer rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 transition-colors hover:bg-accent data-[checked]:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

const labelClassName = "text-sm font-medium text-foreground"

const descriptionClassName = "text-sm text-muted-foreground"

const priceClassName = "text-sm font-semibold text-primary"

const checkIcon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.svg(
        [
            h.ViewBox("0 0 24 24"),
            h.Fill("none"),
            h.Class("size-5 text-primary"),
        ],
        [
            h.path(
                [
                    h.D(
                        "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ),
                    h.Stroke("currentColor"),
                    h.StrokeWidth("1.5"),
                    h.StrokeLinecap("round"),
                    h.StrokeLinejoin("round"),
                ],
                []
            ),
        ]
    )
}

const checkPlaceholder = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div([h.Class("size-5")], [])
}

/**
 * The radio groups expose the same plan choices in vertical and horizontal
 * orientations. Each selection is stored independently in the lab model, while
 * the headless component manages roles, focus, and directional navigation.
 */
export const view = <ParentMessage>(
    maybeHorizontalValue: Option.Option<Plan>,
    maybeVerticalValue: Option.Option<Plan>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const renderRadioGroup = (
        id: string,
        selectedValue: Option.Option<Plan>,
        onSelect: (value: Plan) => ParentMessage,
        isHorizontal: boolean
    ): Html =>
        radioGroupView(
            {
                id,
                selectedValue,
                onSelect,
                options: plans,
                ariaLabel: "Server plan",
                orientation: isHorizontal ? "Horizontal" : "Vertical",
                toView: (render) =>
                    h.div(
                        [
                            ...render.group,
                            h.Class(
                                isHorizontal
                                    ? horizontalGroupClassName
                                    : verticalGroupClassName
                            ),
                        ],
                        render.options.map((option) =>
                            h.div(
                                [
                                    ...option.option,
                                    h.Class(
                                        isHorizontal
                                            ? horizontalOptionClassName
                                            : verticalOptionClassName
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex w-full items-center justify-between"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.span(
                                                        [
                                                            ...option.label,
                                                            h.Class(
                                                                labelClassName
                                                            ),
                                                        ],
                                                        [option.value]
                                                    ),
                                                    h.p(
                                                        [
                                                            ...option.description,
                                                            h.Class(
                                                                descriptionClassName
                                                            ),
                                                        ],
                                                        [
                                                            planDescriptions[
                                                                option.value
                                                            ],
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center gap-3"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                priceClassName
                                                            ),
                                                        ],
                                                        [
                                                            planPrices[
                                                                option.value
                                                            ],
                                                        ]
                                                    ),
                                                    option.isSelected
                                                        ? checkIcon<ParentMessage>(
                                                              h
                                                          )
                                                        : checkPlaceholder<ParentMessage>(
                                                              h
                                                          ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
            },
            h
        )

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Radio Group"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Vertical"]
            ),
            renderRadioGroup(
                "vertical-radio-group-demo",
                maybeVerticalValue,
                (value) => toParentMessage(SelectedVertical({ value })),
                false
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Horizontal"]
            ),
            renderRadioGroup(
                "horizontal-radio-group-demo",
                maybeHorizontalValue,
                (value) => toParentMessage(SelectedHorizontal({ value })),
                true
            ),
        ]
    )
}
