import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FunctionDemo from "./function.ts"

type ToParentMessage<ParentMessage> = (
    message: FunctionDemo.Message
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
    message: FunctionDemo.Message,
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
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Function examples"),
        ],
        FunctionDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FunctionDemo.SelectedFunctionStage({ stage })
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

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const pipeline_node = <ParentMessage>(
    label: string,
    value: string,
    active: boolean,
    tone: "accent-2" | "green",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                active
                    ? tone === "green"
                        ? "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                        : "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 p-4"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-30"
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
                        active
                            ? tone === "green"
                                ? "mt-2 font-mono text-sm font-semibold text-success"
                                : "mt-2 font-mono text-sm font-semibold text-chart-2"
                            : "mt-2 font-mono text-sm font-semibold"
                    ),
                ],
                [value]
            ),
        ]
    )

const pipe_input_action = <ParentMessage>(
    value: FunctionDemo.PipeInput,
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        String(value),
        FunctionDemo.SelectedFunctionPipeInput({
            pipe_input: value,
        }),
        to_parent_message,
        model.pipe_input === value,
        h
    )

const pipe_view = <ParentMessage>(
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const values = FunctionDemo.pipe_values(model.pipe_input)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · pipe a value immediately",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        ([1, 3, 10] as const).map((value) =>
                            pipe_input_action(
                                value,
                                model,
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            pipeline_node(
                                "input",
                                String(values[0]),
                                true,
                                "accent-2",
                                h
                            ),
                            arrow("+1", h),
                            pipeline_node(
                                "number",
                                String(values[1]),
                                model.pipe_step >= 1,
                                "accent-2",
                                h
                            ),
                            arrow("×2", h),
                            pipeline_node(
                                "number",
                                String(values[2]),
                                model.pipe_step >= 2,
                                "accent-2",
                                h
                            ),
                            arrow("string", h),
                            pipeline_node(
                                "output",
                                values[3],
                                model.pipe_step >= 3,
                                "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run next function",
                                FunctionDemo.ClickedAdvanceFunctionPipe(),
                                to_parent_message,
                                model.pipe_step >= 3,
                                h
                            ),
                            action(
                                "Reset",
                                FunctionDemo.ClickedResetFunctionPipe(),
                                to_parent_message,
                                model.pipe_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Value first",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "pipe(value, f, g, h) applies a known value now. Each function after the initial value is unary: every step receives only the previous step's result.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

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

const flow_view = <ParentMessage>(
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const output = FunctionDemo.flow_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · flow builds a reusable function",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            input_field(
                                "First name",
                                model.flow_first,
                                (value) =>
                                    to_parent_message(
                                        FunctionDemo.UpdatedFunctionFlowFirst({
                                            value,
                                        })
                                    ),
                                h
                            ),
                            input_field(
                                "Last name",
                                model.flow_last,
                                (value) =>
                                    to_parent_message(
                                        FunctionDemo.UpdatedFunctionFlowLast({
                                            value,
                                        })
                                    ),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr]"
                            ),
                        ],
                        [
                            pipeline_node(
                                "first function",
                                `${model.flow_first} ${model.flow_last}`,
                                true,
                                "accent-2",
                                h
                            ),
                            arrow("trim", h),
                            pipeline_node(
                                "string",
                                `${model.flow_first} ${model.flow_last}`.trim(),
                                true,
                                "accent-2",
                                h
                            ),
                            arrow("upper", h),
                            pipeline_node("output", output, true, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Function first",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const makeDisplayName = flow(
  (first: string, last: string) =>
    \`\${first} \${last}\`,
  (name) => name.trim(),
  (name) => name.toUpperCase()
)

makeDisplayName("Ada", "Lovelace")
// "ADA LOVELACE"`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Unlike pipe, flow does not need the input yet. It returns a reusable function. The first function may accept multiple arguments; every later function receives one result.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const input_field = <ParentMessage>(
    label: string,
    value: string,
    onInput: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("block space-y-2")],
        [
            h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.input([
                h.Class(
                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                ),
                h.Value(value),
                h.OnInput(onInput),
            ]),
        ]
    )

const dual_style_action = <ParentMessage>(
    style: FunctionDemo.DualStyle,
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        style === "DataFirst" ? "data-first" : "data-last",
        FunctionDemo.SelectedFunctionDualStyle({
            dual_style: style,
        }),
        to_parent_message,
        model.dual_style === style,
        h
    )

const dual_number_action = <ParentMessage>(
    value: number,
    side: "self" | "that",
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        String(value),
        side === "self"
            ? FunctionDemo.SelectedFunctionDualSelf({ value })
            : FunctionDemo.SelectedFunctionDualThat({ value }),
        to_parent_message,
        side === "self" ? model.dual_self === value : model.dual_that === value,
        h
    )

const dual_view = <ParentMessage>(
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = FunctionDemo.dual_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · one implementation, two calling styles",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            dual_style_action(
                                "DataFirst",
                                model,
                                to_parent_message,
                                h
                            ),
                            dual_style_action(
                                "DataLast",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            number_picker(
                                "self",
                                model.dual_self,
                                [1, 2, 5, 10],
                                (value) =>
                                    dual_number_action(
                                        value,
                                        "self",
                                        model,
                                        to_parent_message,
                                        h
                                    ),
                                h
                            ),
                            number_picker(
                                "that",
                                model.dual_that,
                                [1, 3, 4, 8],
                                (value) =>
                                    dual_number_action(
                                        value,
                                        "that",
                                        model,
                                        to_parent_message,
                                        h
                                    ),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card("call", result.expression, "accent-1", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card(
                                "output",
                                String(result.output),
                                "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why Effect uses dual",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const add = Function.dual<
  (that: number) =>
    (self: number) => number,
  (self: number, that: number) =>
    number
>(
  2,
  (self, that) => self + that
)

add(2, 3)
pipe(2, add(3))
// both 5`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "This is the pattern behind many Effect helpers that work both data-first and data-last. One body supplies both ergonomic call styles.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const number_picker = <ParentMessage>(
    label: string,
    current: number,
    values: ReadonlyArray<number>,
    renderAction: (value: number) => Html,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.div(
                [
                    h.Class(
                        "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [`${label}: ${current}`]
            ),
            h.div([h.Class("flex flex-wrap gap-2")], values.map(renderAction)),
        ]
    )

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "accent-2" | "green" | "accent-1",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-success/40 bg-success/5 text-success"
            : tone === "accent-1"
              ? "border-chart-1/40 bg-chart-1/5 text-chart-1"
              : "border-chart-2/40 bg-chart-2/5 text-chart-2"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-4 ${classes}`)],
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
                [h.Class("mt-2 break-words font-mono text-sm font-semibold")],
                [value]
            ),
        ]
    )
}

const adapter_action = <ParentMessage>(
    mode: FunctionDemo.AdapterMode,
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        FunctionDemo.SelectedFunctionAdapterMode({
            adapter_mode: mode,
        }),
        to_parent_message,
        model.adapter_mode === mode,
        h
    )

const adapters_view = <ParentMessage>(
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = FunctionDemo.adapter_output(model.adapter_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · tiny adapters",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Identity",
                                "Constant",
                                "Flip",
                                "Tupled",
                                "Untupled",
                                "Apply",
                            ] as const
                        ).map((mode) =>
                            adapter_action(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "expression",
                                result.expression,
                                "accent-1",
                                h
                            ),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card("output", result.output, "green", h),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
            panel(
                "Type-only helpers",
                [
                    h.div(
                        [
                            h.Class(
                                "grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-chart-2"
                                            ),
                                        ],
                                        ["Function.satisfies<T>()"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Checks assignability while preserving the expression's more precise inferred type.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-chart-1"
                                            ),
                                        ],
                                        ["Function.cast<A, B>(value)"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Changes only the static TypeScript type. It performs no runtime validation or conversion.",
                                        ]
                                    ),
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

export const view = <ParentMessage>(
    model: FunctionDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Pipe"
                ? pipe_view(model, to_parent_message, h)
                : model.stage === "Flow"
                  ? flow_view(model, to_parent_message, h)
                  : model.stage === "Dual"
                    ? dual_view(model, to_parent_message, h)
                    : adapters_view(model, to_parent_message, h),
        ]
    )
