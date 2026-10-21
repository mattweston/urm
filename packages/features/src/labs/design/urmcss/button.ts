import * as Headless from "@foldkit/ui/button"
import { Button } from "@urm/ui/urmcss/button.ts"
import type { Html, HtmlBuilder } from "foldkit/html"
import { ClickedButton } from "../../button/message.ts"
import type { Model, Message } from "./state.ts"
import { urmcss_href } from "./route.ts"
import { view as calendar_view } from "./calendar.ts"

const baseline_classes =
    "inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] hover:not-data-[disabled]:bg-primary-hover focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-offset-[var(--focus-outline-offset)] focus-visible:outline-ring data-[disabled]:cursor-not-allowed data-[disabled]:bg-secondary data-[disabled]:text-secondary-foreground"

export const button_view = <ParentMessage>(
    model: Model,
    to_parent: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const clicked = to_parent(ClickedButton())
    const plus_icon = () =>
        h.svg(
            [
                h.ViewBox("0 0 24 24"),
                h.Fill("none"),
                h.Stroke("currentColor"),
                h.StrokeWidth("2"),
                h.AriaHidden(true),
            ],
            [h.path([h.D("M12 5v14M5 12h14")], [])]
        )
    const section = (
        title: string,
        description: string,
        children: ReadonlyArray<Html>
    ): Html =>
        h.section([], [h.h2([], [title]), h.p([], [description]), ...children])
    const row = (children: ReadonlyArray<Html>): Html =>
        h.div([h.Class("urmcss-row urmcss-preview")], children)
    const baseline = (disabled = false): Html =>
        Headless.view(
            {
                onClick: clicked,
                isDisabled: disabled,
                toView: ({ button }) =>
                    h.button(
                        [...button, h.Class(baseline_classes)],
                        [disabled ? "Unavailable" : "Try button"]
                    ),
            },
            h
        )

    return h.main(
        [h.Class("urmcss-lab")],
        [
            h.header(
                [],
                [
                    h.a([h.Href(urmcss_href())], ["URMCSS"]),
                    h.h1([], ["Button"]),
                    h.p(
                        [],
                        [
                            "One button contract, shared across the app. Compare presentation, try keyboard activation, and switch the app theme to inspect each example.",
                        ]
                    ),
                    h.output(
                        [h.AriaLive("polite")],
                        [`Button activations: ${model.clickCount}`]
                    ),
                ]
            ),
            h.div(
                [h.Class("urmcss-comparison")],
                [
                    section(
                        "Tailwind",
                        "Existing utility-authored presentation with Foldkit button behavior.",
                        [
                            h.div(
                                [h.Class("urmcss-row")],
                                [baseline(), baseline(true)]
                            ),
                            h.pre(
                                [],
                                [
                                    h.code(
                                        [],
                                        [
                                            'h.button([...button, h.Class("inline-flex …")], ["Try button"])',
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    section(
                        "URMCSS",
                        "The same behavior with presentation owned by one stylesheet.",
                        [
                            row([
                                Button(
                                    {
                                        children: ["Try button"],
                                        onClick: clicked,
                                    },
                                    h
                                ),
                                Button(
                                    {
                                        children: ["Unavailable"],
                                        onClick: clicked,
                                        disabled: true,
                                    },
                                    h
                                ),
                            ]),
                            h.pre(
                                [],
                                [
                                    h.code(
                                        [],
                                        [
                                            'Button({ children: ["Try button"], onClick: clicked }, h)',
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            section(
                "Variants",
                "A closed vocabulary: primary, secondary, outline, quiet, and danger.",
                [
                    row([
                        Button(
                            { children: ["Save changes"], onClick: clicked },
                            h
                        ),
                        Button(
                            {
                                children: ["Cancel"],
                                variant: "secondary",
                                onClick: clicked,
                            },
                            h
                        ),
                        Button(
                            {
                                children: ["Preview"],
                                variant: "outline",
                                onClick: clicked,
                            },
                            h
                        ),
                        Button(
                            {
                                children: ["More options"],
                                variant: "quiet",
                                onClick: clicked,
                            },
                            h
                        ),
                    ]),
                ]
            ),
            section(
                "Sizes",
                "Small, standard, and large controls grow with their content. Touch input keeps a larger minimum target.",
                [
                    row([
                        Button(
                            {
                                children: ["Small"],
                                size: "small",
                                onClick: clicked,
                            },
                            h
                        ),
                        Button({ children: ["Standard"], onClick: clicked }, h),
                        Button(
                            {
                                children: ["Large"],
                                size: "large",
                                onClick: clicked,
                            },
                            h
                        ),
                    ]),
                ]
            ),
            section(
                "Icons and content",
                "Icon-only sizing is explicit and requires an accessible name. Buttons with visible text keep their natural width.",
                [
                    row([
                        Button(
                            {
                                children: [plus_icon(), "Create document"],
                                onClick: clicked,
                            },
                            h
                        ),
                        Button(
                            {
                                children: [plus_icon()],
                                icon_only: true,
                                label: "Create document",
                                onClick: clicked,
                            },
                            h
                        ),
                    ]),
                ]
            ),
            section(
                "Calendar context",
                "Select a date or use the arrow keys. Switch to month and year selection with the heading. Cell attributes drive selected, today, focused, outside-month, and disabled presentation.",
                [
                    calendar_view(model.calendar, to_parent, h),
                    h.pre(
                        [],
                        [
                            h.code(
                                [],
                                [
                                    "button {\n    :where(.urmcss-calendar-cell[data-selected]) > & {\n        background: var(--primary);\n        color: var(--primary-foreground);\n    }\n}",
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [],
                        [
                            "The calendar keeps its Foldkit cell and button attributes. Tomorrow is unavailable to demonstrate disabled state.",
                        ]
                    ),
                ]
            ),
            section(
                "Row actions",
                "Hover the row or tab into it to reveal its action. Touch devices keep actions visible.",
                [
                    h.div(
                        [h.Class("urmcss-action-row urmcss-preview")],
                        [
                            h.a(
                                [
                                    h.Href("#row-action-example"),
                                    h.Id("row-action-example"),
                                ],
                                ["Draft document"]
                            ),
                            Button(
                                {
                                    children: ["Delete"],
                                    variant: "danger",
                                    onClick: clicked,
                                    label: "Delete draft document (demo)",
                                },
                                h
                            ),
                            h.div(
                                [h.Class("urmcss-row")],
                                [
                                    Button(
                                        {
                                            children: ["Nested control"],
                                            variant: "outline",
                                            onClick: clicked,
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            section(
                "Media card actions",
                "Hover the card or tab into it to reveal Edit and Delete. The nested control remains independent. Demo actions update the counter.",
                [
                    h.article(
                        [h.Class("urmcss-media-card urmcss-preview")],
                        [
                            h.a(
                                [
                                    h.Href("#media-action-example"),
                                    h.Id("media-action-example"),
                                    h.Class("urmcss-media-preview"),
                                ],
                                ["Sample media"]
                            ),
                            h.div(
                                [h.Class("urmcss-media-actions")],
                                [
                                    Button(
                                        {
                                            children: ["Edit"],
                                            variant: "secondary",
                                            onClick: clicked,
                                        },
                                        h
                                    ),
                                    Button(
                                        {
                                            children: ["Delete"],
                                            variant: "danger",
                                            onClick: clicked,
                                        },
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("urmcss-row")],
                                [
                                    Button(
                                        {
                                            children: ["Nested control"],
                                            variant: "outline",
                                            onClick: clicked,
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            section(
                "Sidebar context",
                "Direct actions fill the sidebar width. A button inside a nested group keeps its ordinary appearance.",
                [
                    h.div(
                        [h.Class("urmcss-preview urmcss-sidebar-actions")],
                        [
                            Button(
                                {
                                    children: ["Create document"],
                                    onClick: clicked,
                                },
                                h
                            ),
                            Button(
                                {
                                    children: ["Browse documents"],
                                    variant: "secondary",
                                    onClick: clicked,
                                },
                                h
                            ),
                            h.div(
                                [h.Class("urmcss-row")],
                                [
                                    Button(
                                        {
                                            children: ["Nested action"],
                                            variant: "outline",
                                            onClick: clicked,
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.pre(
                        [],
                        [
                            h.code(
                                [],
                                [
                                    "button {\n    :where(.urmcss-sidebar-actions) > & {\n        inline-size: 100%;\n        justify-content: start;\n    }\n}",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            section(
                "Keyboard and disabled state",
                "Tab to each button and activate with Enter or Space. Disabled buttons remain focusable through Foldkit, but must not increase the counter.",
                [
                    row([
                        Button({ children: ["Enabled"], onClick: clicked }, h),
                        Button(
                            {
                                children: ["Unavailable"],
                                disabled: true,
                                onClick: clicked,
                            },
                            h
                        ),
                    ]),
                ]
            ),
        ]
    )
}
