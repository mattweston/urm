import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as CommandsDemo from "./commands.ts"

type ToParentMessage<ParentMessage> = (
    message: CommandsDemo.Message
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
    message: CommandsDemo.Message,
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
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Commands examples"),
        ],
        CommandsDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        CommandsDemo.Message.SelectedCommandsStage({
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

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "violet" | "red",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : tone === "violet"
                ? "border-violet-500/40 bg-violet-500/5 text-violet-500"
                : tone === "red"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-cyan-500/40 bg-cyan-500/5 text-cyan-500"

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

const one_shot_view = <ParentMessage>(
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const flow = CommandsDemo.oneShotFlow(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one-shot Effect as data",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
                            ),
                        ],
                        flow.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        step.active
                                            ? "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-35"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        [String(index + 1).padStart(2, "0")]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [step.label]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [step.value]
                                    ),
                                ]
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "count",
                                String(model.count),
                                "cyan",
                                h
                            ),
                            result_card(
                                "update",
                                model.resetPending
                                    ? "returned DelayReset()"
                                    : "idle",
                                model.resetPending ? "violet" : "cyan",
                                h
                            ),
                            result_card(
                                "runtime",
                                model.resetPending
                                    ? "Command running"
                                    : model.count === 0
                                      ? "result Message handled"
                                      : "waiting for Message",
                                model.resetPending ? "amber" : "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.resetPending
                                    ? "Delay running…"
                                    : "Reset after 900ms",
                                CommandsDemo.Message.ClickedResetAfterDelay(),
                                to_parent_message,
                                model.resetPending,
                                h
                            ),
                            action(
                                "Reset demo",
                                CommandsDemo.Message.ClickedResetCommandsDemo(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Nothing happens inside update",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "ClickedResetAfterDelay leaves count unchanged and returns DelayReset() as data. The Runtime executes its Effect after update returns, then dispatches CompletedDelayReset back through the normal Message loop.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const zip_action = <ParentMessage>(
    zipCode: CommandsDemo.ZipCode,
    selected: CommandsDemo.ZipCode,
    message: CommandsDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => action(zipCode, message, to_parent_message, selected === zipCode, h)

const args_view = <ParentMessage>(
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const command = CommandsDemo.commandInstance(model.zipCode)

    const weatherTone =
        model.weather._tag === "Failure"
            ? "red"
            : model.weather._tag === "Loading"
              ? "amber"
              : model.weather._tag === "Success"
                ? "green"
                : "cyan"

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · per-dispatch args + declared result Messages",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["90210", "10001", "00000"] as const).map((zipCode) =>
                            zip_action(
                                zipCode,
                                model.zipCode,
                                CommandsDemo.Message.SelectedZipCode({
                                    zipCode,
                                }),
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "constructed Command",
                                `${command.name}(${JSON.stringify(command.args)})`,
                                "violet",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                ["runtime executes →"]
                            ),
                            result_card(
                                "weather state",
                                CommandsDemo.weatherLabel(model.weather),
                                weatherTone,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.weather._tag === "Loading"
                                    ? "Looking up…"
                                    : "Lookup weather",
                                CommandsDemo.Message.ClickedLookupWeather(),
                                to_parent_message,
                                model.weather._tag === "Loading",
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "The definition is a contract",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const LookupWeather = Command.define(
  "LookupWeather",
  {
    args: {
      zipCode: Schema.String
    },

    messages: [
      Message.SucceededLookupWeather,
      Message.FailedLookupWeather
    ],

    execute: ({ zipCode }) =>
      ...
  }
)`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Args are the values that vary per dispatch. The messages list is the result vocabulary the Effect is allowed to produce. Command names are verb-first work names; result Messages are facts in past tense.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const test_view = <ParentMessage>(
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const steps = CommandsDemo.testSteps(model.testZipCode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · test the update loop without running Effects",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["90210", "10001", "00000"] as const).map((zipCode) =>
                            zip_action(
                                zipCode,
                                model.testZipCode,
                                CommandsDemo.Message.SelectedTestZipCode({
                                    zipCode,
                                }),
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        steps.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.testStep > index
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-35"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [step.title]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [step.detail]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Advance test story",
                                CommandsDemo.Message.ClickedAdvanceCommandTest(),
                                to_parent_message,
                                model.testStep >= steps.length,
                                h
                            ),
                            action(
                                "Reset",
                                CommandsDemo.Message.ClickedResetCommandTest(),
                                to_parent_message,
                                model.testStep === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Commands are observable data",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Story tests can dispatch the initiating Message, assert the exact Command and args, inject a declared result Message with Command.resolve, then assert the final Model — all without sleeping, fetching, or running the Command Effect.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const interrupt_view = <ParentMessage>(
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const running =
        model.job._tag === "Running" || model.job._tag === "Cancelling"

    const tone =
        model.job._tag === "Cancelled"
            ? "amber"
            : model.job._tag === "Completed"
              ? "green"
              : running
                ? "violet"
                : "cyan"

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · interrupt one-shot work by Model identity",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-[1fr_1fr]")],
                        [
                            result_card(
                                "job state",
                                CommandsDemo.jobLabel(model.job),
                                tone,
                                h
                            ),
                            result_card(
                                "last interrupt outcome",
                                model.lastInterruptOutcome,
                                model.lastInterruptOutcome === "Interrupted"
                                    ? "green"
                                    : model.lastInterruptOutcome === "NotFound"
                                      ? "amber"
                                      : "cyan",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Start 4s task",
                                CommandsDemo.Message.ClickedStartLongTask(),
                                to_parent_message,
                                running,
                                h
                            ),
                            action(
                                "Cancel task",
                                CommandsDemo.Message.ClickedCancelLongTask(),
                                to_parent_message,
                                model.job._tag !== "Running",
                                h
                            ),
                            action(
                                "Reset demo",
                                CommandsDemo.Message.ClickedResetCommandsDemo(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Keyed interrupt definition",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const LongTask = Command.define(
  "LongTask",
  {
    args: {
      jobId: Schema.Number
    },

    messages: [
      Message.CompletedLongTask
    ],

    interrupt: {
      keyFields: ["jobId"],
      toKey: ({ jobId }) =>
        String(jobId)
    },

    execute: ({ jobId }) =>
      ...
  }
)

LongTask.Interrupt(
  { jobId },
  outcome =>
    Message.CompletedCancelLongTask({
      jobId,
      outcome
    })
)`,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Interrupted vs NotFound",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Interrupted means at least one invocation holding that key was stopped, so its normal result Message will never arrive and the cancellation result owns the next state. NotFound means nothing currently holds the key — the work already completed or never started.",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "To replace work safely, wait for the interrupt result and start the replacement from that result branch. Returning `[Old.Interrupt(...), NewWork(...)]` together races them because Commands in one update run independently.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: CommandsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "OneShot"
                ? one_shot_view(model, to_parent_message, h)
                : model.stage === "Args"
                  ? args_view(model, to_parent_message, h)
                  : model.stage === "Test"
                    ? test_view(model, to_parent_message, h)
                    : interrupt_view(model, to_parent_message, h),
        ]
    )
