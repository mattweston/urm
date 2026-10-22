import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ScheduleDemo from "./examples/schedule.ts"

type ToParentMessage<ParentMessage> = (
    message: ScheduleDemo.Message
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
    message: ScheduleDemo.Message,
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
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Schedule examples"),
        ],
        ScheduleDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ScheduleDemo.SelectedScheduleStage({
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

const recurrence_choice = <ParentMessage>(
    limit: number,
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        `recurs(${limit})`,
        ScheduleDemo.SelectedRecurrenceLimit({
            limit,
        }),
        to_parent_message,
        model.recurrence_limit === limit,
        h
    )

const execution_box = <ParentMessage>(
    index: number,
    active: boolean,
    is_initial: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                active
                    ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-3 text-center"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 text-center opacity-30"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [is_initial ? "initial run" : `recurrence ${index}`]
            ),
            h.div(
                [
                    h.Class(
                        active
                            ? "mt-2 font-mono text-sm font-semibold text-cyan-500"
                            : "mt-2 font-mono text-sm font-semibold"
                    ),
                ],
                [`#${index + 1}`]
            ),
        ]
    )

const recurs_view = <ParentMessage>(
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const total = ScheduleDemo.total_executions(model.recurrence_limit)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · recurrences are after the initial run",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            recurrence_choice(1, model, to_parent_message, h),
                            recurrence_choice(2, model, to_parent_message, h),
                            recurrence_choice(3, model, to_parent_message, h),
                            recurrence_choice(5, model, to_parent_message, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3 lg:grid-cols-6"
                            ),
                        ],
                        Array.from({ length: total }, (_, index) =>
                            execution_box(
                                index,
                                model.recurrence_step > index,
                                index === 0,
                                h
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Run next execution",
                                ScheduleDemo.ClickedAdvanceRecurrence(),
                                to_parent_message,
                                model.recurrence_step >= total,
                                h
                            ),
                            action(
                                "Reset",
                                ScheduleDemo.ClickedResetRecurrence(),
                                to_parent_message,
                                model.recurrence_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "The counting rule",
                [
                    h.div(
                        [h.Class("grid gap-px bg-border sm:grid-cols-3")],
                        [
                            h.div(
                                [h.Class("bg-card p-4 text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["initial"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-2xl font-bold"
                                            ),
                                        ],
                                        ["1"]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4 text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["recurrences"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-2xl font-bold text-violet-500"
                                            ),
                                        ],
                                        [String(model.recurrence_limit)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4 text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["max executions"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-2xl font-bold text-cyan-500"
                                            ),
                                        ],
                                        [String(total)]
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

const backoff_choice = <ParentMessage>(
    kind: ScheduleDemo.BackoffKind,
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        ScheduleDemo.SelectedBackoffKind({ kind }),
        to_parent_message,
        model.backoff_kind === kind,
        h
    )

const delay_cell = <ParentMessage>(
    index: number,
    millis: number,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                active
                    ? "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-3 text-center"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 text-center opacity-30"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [`delay ${index + 1}`]
            ),
            h.div(
                [
                    h.Class(
                        active
                            ? "mt-2 font-mono text-sm font-semibold text-violet-500"
                            : "mt-2 font-mono text-sm font-semibold"
                    ),
                ],
                [ScheduleDemo.duration_label(millis)]
            ),
        ]
    )

const backoff_view = <ParentMessage>(
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const delays = ScheduleDemo.backoff_delays(model.backoff_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · delay policy",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            backoff_choice(
                                "Spaced",
                                model,
                                to_parent_message,
                                h
                            ),
                            backoff_choice(
                                "Exponential",
                                model,
                                to_parent_message,
                                h
                            ),
                            backoff_choice(
                                "Fibonacci",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3 lg:grid-cols-5"
                            ),
                        ],
                        delays.map((millis, index) =>
                            delay_cell(
                                index,
                                millis,
                                model.backoff_step > index,
                                h
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Next delay",
                                ScheduleDemo.ClickedAdvanceBackoff(),
                                to_parent_message,
                                model.backoff_step >= delays.length,
                                h
                            ),
                            action(
                                "Reset",
                                ScheduleDemo.ClickedResetBackoff(),
                                to_parent_message,
                                model.backoff_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Policy shape",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.backoff_kind === "Spaced"
                                ? "Schedule.spaced uses the same delay after each completed action."
                                : model.backoff_kind === "Exponential"
                                  ? "Schedule.exponential multiplies the previous delay by a factor (2 by default): 100ms, 200ms, 400ms…"
                                  : "Schedule.fibonacci grows by adding the previous two delays: 100ms, 100ms, 200ms, 300ms…",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "For distributed retries, Schedule.jittered can add random variation to an existing delay policy to reduce synchronized retry spikes.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const compose_choice = <ParentMessage>(
    kind: ScheduleDemo.ComposeKind,
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind === "Limit" ? "upTo" : "concat",
        ScheduleDemo.SelectedComposeKind({ kind }),
        to_parent_message,
        model.compose_kind === kind,
        h
    )

const compose_view = <ParentMessage>(
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const labels = ScheduleDemo.compose_labels(model.compose_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · modify and compose policies",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            compose_choice(
                                "Limit",
                                model,
                                to_parent_message,
                                h
                            ),
                            compose_choice(
                                "Concat",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-2 lg:grid-cols-4"
                            ),
                        ],
                        labels.map((label, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.compose_step > index
                                            ? index === 0 &&
                                              model.compose_kind === "Concat"
                                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4 text-center"
                                                : "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-4 text-center"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 text-center opacity-30"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        [`phase ${index + 1}`]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [label]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Advance",
                                ScheduleDemo.ClickedAdvanceCompose(),
                                to_parent_message,
                                model.compose_step >= labels.length,
                                h
                            ),
                            action(
                                "Reset",
                                ScheduleDemo.ClickedResetCompose(),
                                to_parent_message,
                                model.compose_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "What changed?",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.compose_kind === "Limit"
                                ? "Schedule.upTo bounds another policy by recurrence count and/or elapsed duration. Here an otherwise unbounded schedule stops after three recurrences."
                                : "Schedule.concat runs one Schedule until it completes, then switches to another. This is useful for policies such as one quick retry followed by slower retries.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const run_choice = <ParentMessage>(
    kind: ScheduleDemo.RunKind,
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind === "Retry" ? "Effect.retry" : "Effect.repeat",
        ScheduleDemo.SelectedScheduleRunKind({ kind }),
        to_parent_message,
        model.run_kind === kind,
        h
    )

const run_view = <ParentMessage>(
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const events = ScheduleDemo.run_events(model.run_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Schedule drives Effect execution",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            run_choice("Retry", model, to_parent_message, h),
                            run_choice("Repeat", model, to_parent_message, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "space-y-2 border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        events.map((event, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.run_step > index
                                            ? "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-center"
                                            : "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 opacity-30 sm:grid-cols-[8rem_1fr_1fr] sm:items-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [event.label]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                event.outcome === "Success"
                                                    ? "font-mono text-xs text-emerald-600"
                                                    : "font-mono text-xs text-destructive"
                                            ),
                                        ],
                                        [event.outcome]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "mr-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Schedule input"]
                                            ),
                                            h.span(
                                                [h.Class("font-mono text-xs")],
                                                [event.schedule_input]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Run next",
                                ScheduleDemo.ClickedAdvanceScheduleRun(),
                                to_parent_message,
                                model.run_step >= events.length,
                                h
                            ),
                            action(
                                "Reset",
                                ScheduleDemo.ClickedResetScheduleRun(),
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
                "Input channel",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.run_kind === "Retry"
                                ? "Effect.retry steps the Schedule when the Effect fails, so the Schedule input is the typed error. A Success ends the retry loop."
                                : "Effect.repeat steps the Schedule after successful executions, so the Schedule input is the Effect's success value. An Effect failure stops repetition.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Schedule type",
                [
                    h.div(
                        [h.Class("grid gap-px bg-border sm:grid-cols-4")],
                        [
                            ["Output", "policy output"],
                            [
                                "Input",
                                model.run_kind === "Retry"
                                    ? "Effect error"
                                    : "Effect success",
                            ],
                            ["Error", "schedule error"],
                            ["Env", "schedule services"],
                        ].map(([label, value]) =>
                            h.div(
                                [h.Class("bg-card p-4")],
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
                                                "mt-2 font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [value]
                                    ),
                                ]
                            )
                        )
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: ScheduleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Recurs"
                ? recurs_view(model, to_parent_message, h)
                : model.stage === "Backoff"
                  ? backoff_view(model, to_parent_message, h)
                  : model.stage === "Compose"
                    ? compose_view(model, to_parent_message, h)
                    : run_view(model, to_parent_message, h),
        ]
    )
