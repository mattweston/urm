import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as EffectDemo from "./effect.ts"

type ToParentMessage<ParentMessage> = (
    message: EffectDemo.Message
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
    message: EffectDemo.Message,
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
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect core examples"),
        ],
        EffectDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        EffectDemo.SelectedEffectStage({ stage })
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

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "green" | "red" | "amber" | "accent-1" | "accent-2",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-success/40 bg-success/5 text-success"
            : tone === "red"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : tone === "amber"
                ? "border-warning/40 bg-warning/5 text-warning"
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

const channel_case_action = <ParentMessage>(
    channel_case: EffectDemo.ChannelCase,
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        channel_case,
        EffectDemo.SelectedEffectChannelCase({ channel_case }),
        to_parent_message,
        model.channel_case === channel_case,
        h
    )

const channel_box = <ParentMessage>(
    label: string,
    symbol: string,
    value: string,
    tone: "green" | "red" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-success/40 bg-success/5 text-success"
            : tone === "red"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-warning/40 bg-warning/5 text-warning"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-4 ${classes}`)],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.span(
                        [
                            h.Class(
                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                            ),
                        ],
                        [label]
                    ),
                    h.span([h.Class("font-mono text-xl font-bold")], [symbol]),
                ]
            ),
            h.div([h.Class("mt-6 font-mono text-sm font-semibold")], [value]),
        ]
    )
}

const channels_view = <ParentMessage>(
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const type = EffectDemo.channel_type(model.channel_case)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · Effect<A, E, R>",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Pure", "Failure", "Service", "Both"] as const).map(
                            (channel_case) =>
                                channel_case_action(
                                    channel_case,
                                    model,
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [type.code]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-3"
                            ),
                        ],
                        [
                            channel_box(
                                "Success",
                                "A",
                                type.success,
                                "green",
                                h
                            ),
                            channel_box("Error", "E", type.error, "red", h),
                            channel_box(
                                "Services",
                                "R",
                                type.services,
                                "amber",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Read the type as a capability description",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Effect<A, E, R> describes a program that can succeed with A, fail recoverably with E, and requires services R before it can run. `never` means that channel has nothing in it.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const build_mode_action = <ParentMessage>(
    build_mode: EffectDemo.BuildMode,
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        build_mode,
        EffectDemo.SelectedEffectBuildMode({ build_mode }),
        to_parent_message,
        model.build_mode === build_mode,
        h
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

const build_view = <ParentMessage>(
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const description = EffectDemo.build_description(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · constructors describe work",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Succeed", "Sync", "Try", "TryPromise"] as const).map(
                            (build_mode) =>
                                build_mode_action(
                                    build_mode,
                                    model,
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
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
                                        ["description"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 font-mono text-xs")],
                                        [description.code]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-4 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [description.before]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.build_has_run
                                        ? "runtime executed →"
                                        : "lazy until run →",
                                ]
                            ),
                            result_card(
                                "observation",
                                description.after,
                                description.failed
                                    ? "red"
                                    : model.build_has_run
                                      ? "green"
                                      : "amber",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run",
                                EffectDemo.ClickedRunEffectConstructor(),
                                to_parent_message,
                                model.build_has_run,
                                h
                            ),
                            action(
                                "Reset",
                                EffectDemo.ClickedResetEffectConstructor(),
                                to_parent_message,
                                !model.build_has_run,
                                h
                            ),
                            ...(model.build_mode === "Try" ||
                            model.build_mode === "TryPromise"
                                ? [
                                      action(
                                          model.build_valid_input
                                              ? "Make input fail"
                                              : "Make input succeed",
                                          EffectDemo.ToggledEffectBuildInput(),
                                          to_parent_message,
                                          false,
                                          h
                                      ),
                                  ]
                                : []),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Constructor rule",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [description.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const compose_mode_action = <ParentMessage>(
    compose_mode: EffectDemo.ComposeMode,
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        compose_mode,
        EffectDemo.SelectedEffectComposeMode({ compose_mode }),
        to_parent_message,
        model.compose_mode === compose_mode,
        h
    )

const compose_input_action = <ParentMessage>(
    compose_input: EffectDemo.ComposeInput,
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        JSON.stringify(compose_input),
        EffectDemo.SelectedEffectComposeInput({ compose_input }),
        to_parent_message,
        model.compose_input === compose_input,
        h
    )

const compose_view = <ParentMessage>(
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const output = EffectDemo.compose_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · compose without losing channels",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Map", "FlatMap", "Gen", "All"] as const).map(
                            (compose_mode) =>
                                compose_mode_action(
                                    compose_mode,
                                    model,
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        (["36", "15", "oops"] as const).map((compose_input) =>
                            compose_input_action(
                                compose_input,
                                model,
                                to_parent_message,
                                h
                            )
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
                                "resulting Effect type",
                                output.type,
                                "accent-1",
                                h
                            ),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            result_card(
                                "runtime outcome",
                                output.output,
                                output.failed ? "red" : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "What changes?",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [output.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const run_input_action = <ParentMessage>(
    run_input: EffectDemo.RunInput,
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        JSON.stringify(run_input),
        EffectDemo.SelectedEffectRunInput({ run_input }),
        to_parent_message,
        model.run_input === run_input,
        h
    )

const run_view = <ParentMessage>(
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const stages = EffectDemo.run_stage(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · handle channels, then cross the runtime boundary",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["36", "oops"] as const).map((run_input) =>
                            run_input_action(
                                run_input,
                                model,
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "space-y-2 border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        stages.map((stage, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.run_step > index
                                            ? "grid gap-3 rounded-[var(--radius-surface)] border border-chart-1/30 bg-chart-1/5 p-4 lg:grid-cols-[7rem_1.2fr_1fr] lg:items-center"
                                            : "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-30 lg:grid-cols-[7rem_1.2fr_1fr] lg:items-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-chart-1"
                                            ),
                                        ],
                                        [stage.label]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono text-xs font-semibold"
                                                    ),
                                                ],
                                                [stage.type]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 text-[10px] leading-4 text-muted-foreground"
                                                    ),
                                                ],
                                                [stage.detail]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs text-success"
                                            ),
                                        ],
                                        [stage.value]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Advance",
                                EffectDemo.ClickedAdvanceEffectRun(),
                                to_parent_message,
                                model.run_step >= stages.length,
                                h
                            ),
                            action(
                                "Reset",
                                EffectDemo.ClickedResetEffectRun(),
                                to_parent_message,
                                model.run_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Execution boundary",
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
                                        ["Effect.runPromise"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Returns Promise<A>. Effect failure becomes Promise rejection.",
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
                                        ["Effect.runPromiseExit"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Returns Promise<Exit<A,E>> so success/failure/cause can be observed as data.",
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
    model: EffectDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Channels"
                ? channels_view(model, to_parent_message, h)
                : model.stage === "Build"
                  ? build_view(model, to_parent_message, h)
                  : model.stage === "Compose"
                    ? compose_view(model, to_parent_message, h)
                    : run_view(model, to_parent_message, h),
        ]
    )
