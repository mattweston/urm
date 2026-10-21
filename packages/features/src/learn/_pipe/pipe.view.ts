import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as PipeDemo from "./pipe.ts"

type ToParentMessage<ParentMessage> = (
    message: PipeDemo.Message
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
    message: PipeDemo.Message,
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
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("pipe and Pipeable examples"),
        ],
        PipeDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        PipeDemo.SelectedPipeStage({ stage })
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
    kicker: string,
    value: string,
    is_active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                is_active
                    ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4 text-center"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 text-center opacity-35"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [kicker]
            ),
            h.div(
                [
                    h.Class(
                        is_active
                            ? "mt-2 font-mono text-sm font-semibold text-cyan-500"
                            : "mt-2 font-mono text-sm font-semibold"
                    ),
                ],
                [value]
            ),
        ]
    )

const value_view = <ParentMessage>(
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const values = PipeDemo.value_pipeline()

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · pipe applies a value now",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            pipeline_node("input", values.input, true, h),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ +1 →"]
                            ),
                            pipeline_node(
                                "number",
                                values.add,
                                model.value_step >= 1,
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ ×2 →"]
                            ),
                            pipeline_node(
                                "number",
                                values.multiply,
                                model.value_step >= 2,
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ string →"]
                            ),
                            pipeline_node(
                                "output",
                                values.output,
                                model.value_step >= 3,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run next function",
                                PipeDemo.ClickedAdvancePipeValue(),
                                to_parent_message,
                                model.value_step === 3,
                                h
                            ),
                            action(
                                "Reset",
                                PipeDemo.ClickedResetPipeValue(),
                                to_parent_message,
                                model.value_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "The rule",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "pipe(value, f, g, h) calls f(value), then g(result), then h(result). Each step is unary and TypeScript carries the output type of one step into the input type of the next.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const effect_view = <ParentMessage>(
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Effect is Pipeable",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "pipe(effect, ...)",
                                PipeDemo.SelectedEffectPipeSyntax({
                                    syntax: "Function",
                                }),
                                to_parent_message,
                                model.effect_syntax === "Function",
                                h
                            ),
                            action(
                                "effect.pipe(...)",
                                PipeDemo.SelectedEffectPipeSyntax({
                                    syntax: "Method",
                                }),
                                to_parent_message,
                                model.effect_syntax === "Method",
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
                            pipeline_node("Effect", "succeed(1)", true, h),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ map +1 →"]
                            ),
                            pipeline_node(
                                "Effect",
                                "succeed(2)",
                                model.effect_has_run,
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ flatMap ×2 →"]
                            ),
                            pipeline_node(
                                "Effect",
                                "succeed(4)",
                                model.effect_has_run,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border bg-background px-5 py-4 font-mono text-xs"
                            ),
                        ],
                        [
                            model.effect_syntax === "Function"
                                ? "pipe(Effect.succeed(1), Effect.map(...), Effect.flatMap(...))"
                                : "Effect.succeed(1).pipe(Effect.map(...), Effect.flatMap(...))",
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run",
                                PipeDemo.ClickedRunEffectPipe(),
                                to_parent_message,
                                model.effect_has_run,
                                h
                            ),
                            action(
                                "Reset",
                                PipeDemo.ClickedResetEffectPipe(),
                                to_parent_message,
                                !model.effect_has_run,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Same composition, different entry point",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Effect extends Pipeable, so .pipe is available directly on the Effect value. The standalone pipe function works with any value; the method form only exists on values that implement Pipeable.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const custom_choice = <ParentMessage>(
    kind: PipeDemo.CustomKind,
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        PipeDemo.SelectedCustomPipeableKind({ kind }),
        to_parent_message,
        model.custom_kind === kind,
        h
    )

const custom_view = <ParentMessage>(
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = PipeDemo.custom_result(model.custom_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · add .pipe to your own value",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            custom_choice("Class", model, to_parent_message, h),
                            custom_choice("Mixin", model, to_parent_message, h),
                            custom_choice(
                                "Manual",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-5 text-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Pipeable value"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [result.source]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [".pipe(...) →"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.custom_has_run
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-5 text-center"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border p-5 text-center opacity-40"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Result"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-2xl font-bold text-emerald-600"
                                            ),
                                        ],
                                        [
                                            model.custom_has_run
                                                ? result.output
                                                : "?",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run pipe",
                                PipeDemo.ClickedRunCustomPipeable(),
                                to_parent_message,
                                model.custom_has_run,
                                h
                            ),
                            action(
                                "Reset",
                                PipeDemo.ClickedResetCustomPipeable(),
                                to_parent_message,
                                !model.custom_has_run,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Implementation choice",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.custom_kind === "Class"
                                ? "Extend Pipeable.Class when you control the class and want the standard .pipe implementation."
                                : model.custom_kind === "Mixin"
                                  ? "Pipeable.Mixin wraps an existing class constructor and adds the standard .pipe method."
                                  : "Pipeable.pipeArguments is the low-level helper used when you implement pipe manually.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const flow_step = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 text-center"
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
            h.div([h.Class("mt-2 font-mono text-xs font-semibold")], [value]),
        ]
    )

const flow_view = <ParentMessage>(
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const trimmed = model.flow_input.trim()
    const lower = trimmed.toLowerCase()
    const result = PipeDemo.flow_result(model.flow_input)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · flow builds a reusable pipeline",
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
                                        ["Input"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.flow_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                PipeDemo.UpdatedPipeFlowInput({
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
                                        "mt-5 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    flow_step("trim", trimmed, h),
                                    h.span(
                                        [
                                            h.Class(
                                                "self-center text-center text-muted-foreground"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_step("lowercase", lower, h),
                                    h.span(
                                        [
                                            h.Class(
                                                "self-center text-center text-muted-foreground"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_step("spaces → -", result, h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "pipe vs flow",
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
                                                "font-mono text-xs font-semibold text-cyan-500"
                                            ),
                                        ],
                                        ["pipe(value, f, g)"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Apply a known value through the transformations immediately.",
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
                                                "font-mono text-xs font-semibold text-violet-500"
                                            ),
                                        ],
                                        ["flow(f, g)"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Create a reusable function that will apply the transformations later.",
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
    model: PipeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Value"
                ? value_view(model, to_parent_message, h)
                : model.stage === "Effect"
                  ? effect_view(model, to_parent_message, h)
                  : model.stage === "Custom"
                    ? custom_view(model, to_parent_message, h)
                    : flow_view(model, to_parent_message, h),
        ]
    )
