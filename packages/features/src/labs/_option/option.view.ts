import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as OptionDemo from "./option.ts"

type ToParentMessage<ParentMessage> = (
    message: OptionDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: OptionDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Option examples"),
        ],
        OptionDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        OptionDemo.SelectedOptionStage({
                            stage,
                        })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const badge = <ParentMessage>(
    text: string,
    tone: "none" | "some",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                tone === "some"
                    ? "rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 font-mono text-xs text-emerald-600"
                    : "rounded-full border border-amber-500/40 bg-amber-500/5 px-3 py-1 font-mono text-xs text-amber-600"
            ),
        ],
        [text]
    )

const option_badge = <ParentMessage, A>(
    option: Option.Option<A>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    badge(
        OptionDemo.option_to_label(option),
        Option.isSome(option) ? "some" : "none",
        h
    )

const construct_view = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const from_nullish = OptionDemo.boundary_option(model.boundary_case)
    const parsed = OptionDemo.safe_parse(model.parse_input)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · bring absence to the boundary",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "undefined",
                                OptionDemo.SelectedBoundaryCase({
                                    boundary_case: "Undefined",
                                }),
                                to_parent_message,
                                model.boundary_case === "Undefined",
                                h
                            ),
                            action(
                                "null",
                                OptionDemo.SelectedBoundaryCase({
                                    boundary_case: "Null",
                                }),
                                to_parent_message,
                                model.boundary_case === "Null",
                                h
                            ),
                            action(
                                '"Ada"',
                                OptionDemo.SelectedBoundaryCase({
                                    boundary_case: "Value",
                                }),
                                to_parent_message,
                                model.boundary_case === "Value",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["JavaScript value"]
                                    ),
                                    h.div(
                                        [h.Class("mt-2 font-mono text-sm")],
                                        [
                                            model.boundary_case === "Undefined"
                                                ? "undefined"
                                                : model.boundary_case === "Null"
                                                  ? "null"
                                                  : '"Ada"',
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Option.fromNullishOr →"]
                            ),
                            h.div(
                                [h.Class("self-center")],
                                [option_badge(from_nullish, h)]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "lift throwing code",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["JSON input"]
                                    ),
                                    h.textarea([
                                        h.Class(
                                            "min-h-[112px] w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.parse_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                OptionDemo.UpdatedParseInput({
                                                    value,
                                                })
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-4 flex flex-wrap items-center gap-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs text-violet-500"
                                            ),
                                        ],
                                        ["Option.liftThrowable(JSON.parse)"]
                                    ),
                                    option_badge(parsed, h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_view = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const source = OptionDemo.transform_source(model.transform_input)
    const output = OptionDemo.transformed_option(model.transform_input)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · map, filter, then flatMap",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "none",
                                OptionDemo.SelectedTransformInput({
                                    transform_input: "None",
                                }),
                                to_parent_message,
                                model.transform_input === "None",
                                h
                            ),
                            action(
                                "some(2)",
                                OptionDemo.SelectedTransformInput({
                                    transform_input: "Two",
                                }),
                                to_parent_message,
                                model.transform_input === "Two",
                                h
                            ),
                            action(
                                "some(4)",
                                OptionDemo.SelectedTransformInput({
                                    transform_input: "Four",
                                }),
                                to_parent_message,
                                model.transform_input === "Four",
                                h
                            ),
                            action(
                                "some(7)",
                                OptionDemo.SelectedTransformInput({
                                    transform_input: "Seven",
                                }),
                                to_parent_message,
                                model.transform_input === "Seven",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]"
                            ),
                        ],
                        [
                            option_card("source", source, h),
                            arrow("map(*2)", h),
                            option_card(
                                "after map",
                                Option.match(source, {
                                    onNone: () => Option.none<number>(),
                                    onSome: (value) => Option.some(value * 2),
                                }),
                                h
                            ),
                            arrow("filter(>=8)", h),
                            option_card(
                                "after filter",
                                pipe(
                                    source,
                                    Option.map((n) => n * 2),
                                    Option.filter((n) => n >= 8)
                                ),
                                h
                            ),
                            arrow("flatMap", h),
                            option_card("output", output, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const pipe = <A>(value: A, ...fns: ReadonlyArray<(value: any) => any>): any =>
    fns.reduce((current, f) => f(current), value)

const arrow = <ParentMessage>(
    label: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "self-center text-center font-mono text-[11px] text-muted-foreground"
            ),
        ],
        [`→ ${label} →`]
    )

const option_card = <ParentMessage, A>(
    label: string,
    option: Option.Option<A>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                Option.isSome(option)
                    ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        Option.isSome(option)
                            ? "mt-2 font-mono text-xs text-emerald-600"
                            : "mt-2 font-mono text-xs text-amber-600"
                    ),
                ],
                [OptionDemo.option_to_label(option)]
            ),
        ]
    )

const combine_view = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = OptionDemo.combine_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · require many values at once",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "Tuple",
                                OptionDemo.SelectedCombineMode({
                                    combine_mode: "Tuple",
                                }),
                                to_parent_message,
                                model.combine_mode === "Tuple",
                                h
                            ),
                            action(
                                "Struct",
                                OptionDemo.SelectedCombineMode({
                                    combine_mode: "Struct",
                                }),
                                to_parent_message,
                                model.combine_mode === "Struct",
                                h
                            ),
                            action(
                                "ZipWith",
                                OptionDemo.SelectedCombineMode({
                                    combine_mode: "ZipWith",
                                }),
                                to_parent_message,
                                model.combine_mode === "ZipWith",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-3"
                            ),
                        ],
                        [
                            toggle_card(
                                "name",
                                model.has_name,
                                OptionDemo.ToggledHasName(),
                                to_parent_message,
                                h
                            ),
                            toggle_card(
                                "age",
                                model.has_age,
                                OptionDemo.ToggledHasAge(),
                                to_parent_message,
                                h
                            ),
                            toggle_card(
                                "city",
                                model.has_city,
                                OptionDemo.ToggledHasCity(),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("font-mono text-xs text-violet-500")],
                                [
                                    model.combine_mode === "Tuple"
                                        ? "Option.all([name, age])"
                                        : model.combine_mode === "Struct"
                                          ? "Option.all({ name, age, city })"
                                          : "Option.zipWith(name, city, combine)",
                                ]
                            ),
                            h.div([h.Class("mt-3")], [option_badge(result, h)]),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const toggle_card = <ParentMessage>(
    label: string,
    on: boolean,
    message: OptionDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                on
                    ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.div(
                        [h.Class("text-sm font-semibold capitalize")],
                        [label]
                    ),
                    action(
                        on ? "Some" : "None",
                        message,
                        to_parent_message,
                        false,
                        h
                    ),
                ]
            ),
        ]
    )

const unwrap_view = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const source = OptionDemo.unwrap_source(model.has_user)
    const output = OptionDemo.unwrap_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · turn Option back into a concrete value",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "Match",
                                OptionDemo.SelectedUnwrapMode({
                                    unwrap_mode: "Match",
                                }),
                                to_parent_message,
                                model.unwrap_mode === "Match",
                                h
                            ),
                            action(
                                "GetOrElse",
                                OptionDemo.SelectedUnwrapMode({
                                    unwrap_mode: "GetOrElse",
                                }),
                                to_parent_message,
                                model.unwrap_mode === "GetOrElse",
                                h
                            ),
                            action(
                                "Gen",
                                OptionDemo.SelectedUnwrapMode({
                                    unwrap_mode: "Gen",
                                }),
                                to_parent_message,
                                model.unwrap_mode === "Gen",
                                h
                            ),
                            action(
                                model.has_user
                                    ? "User present"
                                    : "User missing",
                                OptionDemo.ToggledHasUser(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("self-center")],
                                [option_badge(source, h)]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.unwrap_mode === "Match"
                                        ? "Option.match →"
                                        : model.unwrap_mode === "GetOrElse"
                                          ? "Option.getOrElse →"
                                          : "Option.gen →",
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Output"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-sm text-cyan-500"
                                            ),
                                        ],
                                        [output]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Mental model",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Option is for presence or absence, not error details. Use it at boundaries, compose transformations while values are optional, combine independent optional values, then explicitly unwrap with match or a fallback.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: OptionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Construct"
                ? construct_view(model, to_parent_message, h)
                : model.stage === "Transform"
                  ? transform_view(model, to_parent_message, h)
                  : model.stage === "Combine"
                    ? combine_view(model, to_parent_message, h)
                    : unwrap_view(model, to_parent_message, h),
        ]
    )
