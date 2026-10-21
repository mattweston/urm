import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ALIGN_ITEMS_CLASS_NAMES,
    AlignItems,
    FLEX_DIRECTION_CLASS_NAMES,
    FlexDirection,
    JUSTIFY_CONTENT_CLASS_NAMES,
    JustifyContent,
    flex,
    flexClassName,
    parseAlignItems,
    parseFlexDirection,
    parseJustifyContent,
} from "./flex.ts"
import {
    ChangedAlignItems,
    ChangedFlexDirection,
    ChangedJustifyContent,
    ToggledUnevenChildren,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const selectClassName =
    "h-9 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"

const controlLabelClassName = "block text-sm font-medium text-foreground"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary"

const checkboxLabelClassName =
    "text-sm font-normal text-foreground cursor-pointer select-none"

const descriptionClassName = "text-sm text-muted-foreground"

const codeClassName =
    "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"

const boxClassName =
    "flex w-24 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-medium text-foreground ring-1 ring-primary/30"

const select = <ParentMessage>(
    config: Readonly<{
        id: string
        label: string
        value: string
        options: ReadonlyArray<string>
        onInput: (value: string) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-1.5")],
        [
            h.label(
                [h.For(config.id), h.Class(controlLabelClassName)],
                [config.label]
            ),
            h.select(
                [
                    h.Id(config.id),
                    h.Value(config.value),
                    h.Class(selectClassName),
                    h.OnInput(config.onInput),
                ],
                config.options.map((option) =>
                    h.keyed("option")(option, [h.Value(option)], [option])
                )
            ),
        ]
    )

const unevenToggle = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Checkbox.view(
        {
            id: "layout-flex-uneven",
            isChecked: model.unevenChildren,
            onToggle: (isUneven) =>
                toParentMessage(ToggledUnevenChildren({ isUneven })),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.button(
                            [
                                ...attributes.checkbox,
                                h.Class(checkboxClassName),
                            ],
                            model.unevenChildren
                                ? [
                                      h.span(
                                          [
                                              h.Class(
                                                  "text-xs text-primary-foreground"
                                              ),
                                          ],
                                          ["✓"]
                                      ),
                                  ]
                                : []
                        ),
                        h.label(
                            [
                                ...attributes.label,
                                h.Class(checkboxLabelClassName),
                            ],
                            ["Give the children different heights"]
                        ),
                    ]
                ),
        },
        h
    )

const demoBox = <ParentMessage>(
    label: string,
    heightClassName: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("div")(
        label,
        [h.Class(`${boxClassName} ${heightClassName}`)],
        [label]
    )

type Mapping = Readonly<{ value: string; className: string }>

const mappingTable = <ParentMessage>(
    title: string,
    entries: ReadonlyArray<Mapping>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border bg-muted px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    ),
                ],
                [title]
            ),
            h.dl(
                [h.Class("divide-y divide-border")],
                entries.map((entry) =>
                    h.keyed("div")(
                        entry.value,
                        [
                            h.Class(
                                "flex items-center justify-between gap-3 px-3 py-1.5"
                            ),
                        ],
                        [
                            h.dt(
                                [h.Class("text-sm text-foreground")],
                                [entry.value]
                            ),
                            h.dd(
                                [],
                                [
                                    h.code(
                                        [h.Class(codeClassName)],
                                        [entry.className]
                                    ),
                                ]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const entriesOf = (
    classNames: Readonly<Record<string, string>>,
    keys: ReadonlyArray<string>
): ReadonlyArray<Mapping> =>
    keys.map((key) => ({ value: key, className: classNames[key] ?? "" }))

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const config = {
        flexDirection: model.flexDirection,
        justifyContent: model.justifyContent,
        alignItems: model.alignItems,
    }

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Flex"]
            ),

            h.p(
                [h.Class(`${descriptionClassName} max-w-2xl`)],
                [
                    "A layout primitive over a flex w-full base: three prop unions, each mapped onto exactly one Tailwind class. The point is that the props are the vocabulary a caller reasons in, while the class names stay an implementation detail the component can change.",
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-2 max-w-2xl`)],
                [
                    "Defaults are row, between, and center — the arrangement a toolbar or a list row wants, which is most of them.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Demo"]
            ),
            h.div(
                [h.Class("grid max-w-3xl gap-3 sm:grid-cols-3")],
                [
                    select(
                        {
                            id: "layout-flex-direction",
                            label: "flexDirection",
                            value: model.flexDirection,
                            options: FlexDirection.literals,
                            onInput: (value) =>
                                toParentMessage(
                                    ChangedFlexDirection({
                                        value:
                                            parseFlexDirection(value) ??
                                            model.flexDirection,
                                    })
                                ),
                        },
                        h
                    ),
                    select(
                        {
                            id: "layout-flex-justify",
                            label: "justifyContent",
                            value: model.justifyContent,
                            options: JustifyContent.literals,
                            onInput: (value) =>
                                toParentMessage(
                                    ChangedJustifyContent({
                                        value:
                                            parseJustifyContent(value) ??
                                            model.justifyContent,
                                    })
                                ),
                        },
                        h
                    ),
                    select(
                        {
                            id: "layout-flex-align",
                            label: "alignItems",
                            value: model.alignItems,
                            options: AlignItems.literals,
                            onInput: (value) =>
                                toParentMessage(
                                    ChangedAlignItems({
                                        value:
                                            parseAlignItems(value) ??
                                            model.alignItems,
                                    })
                                ),
                        },
                        h
                    ),
                ]
            ),
            h.div([h.Class("mt-4")], [unevenToggle(model, toParentMessage, h)]),
            h.div(
                [
                    h.Class(
                        "mt-4 h-56 max-w-3xl overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30 p-3"
                    ),
                ],
                [
                    flex(
                        { ...config, className: "h-full gap-3" },
                        [],
                        [
                            demoBox(
                                "one",
                                model.unevenChildren ? "h-10" : "h-16",
                                h
                            ),
                            demoBox(
                                "two",
                                model.unevenChildren ? "h-20" : "h-16",
                                h
                            ),
                            demoBox(
                                "three",
                                model.unevenChildren ? "h-32" : "h-16",
                                h
                            ),
                        ],
                        h
                    ),
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-3 max-w-3xl`)],
                [
                    "The container renders as ",
                    h.code([h.Class(codeClassName)], [flexClassName(config)]),
                    ".",
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-2 max-w-3xl`)],
                [
                    "The className a caller passes is merged last through cn(), so a caller's justify-start beats the one the justifyContent prop chose rather than landing in the same class list and losing to stylesheet order.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Prop to class"]
            ),
            h.div(
                [h.Class("grid max-w-4xl gap-4 md:grid-cols-3")],
                [
                    mappingTable(
                        "flexDirection",
                        entriesOf(
                            FLEX_DIRECTION_CLASS_NAMES,
                            FlexDirection.literals
                        ),
                        h
                    ),
                    mappingTable(
                        "justifyContent",
                        entriesOf(
                            JUSTIFY_CONTENT_CLASS_NAMES,
                            JustifyContent.literals
                        ),
                        h
                    ),
                    mappingTable(
                        "alignItems",
                        entriesOf(ALIGN_ITEMS_CLASS_NAMES, AlignItems.literals),
                        h
                    ),
                ]
            ),
        ]
    )
}
