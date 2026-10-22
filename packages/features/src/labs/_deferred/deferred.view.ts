import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as DeferredDemo from "./deferred.ts"

type ToParentMessage<ParentMessage> = (
    message: DeferredDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: DeferredDemo.Stage,
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                DeferredDemo.Message.SelectedDeferredStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            model.stage === stage
                                ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [stage]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Deferred examples"),
        ],
        DeferredDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
        )
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const panel = <ParentMessage>(
    title: string,
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
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" | "red" = "default"
): Html => {
    const tone_class =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "red"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${tone_class}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-1 break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    is_active: boolean,
    message: DeferredDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            is_active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const intro_panel = <ParentMessage>(
    details: DeferredDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const fiber_row = <ParentMessage>(
    name: string,
    state: string,
    tone: "waiting" | "ready" | "idle",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const dot_class =
        tone === "waiting"
            ? "bg-amber-500"
            : tone === "ready"
              ? "bg-emerald-500"
              : "bg-muted-foreground/40"

    return h.div(
        [
            h.Class(
                "grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-background/70 p-3"
            ),
        ],
        [
            h.div([
                h.Class(`size-2.5 rounded-full ${dot_class}`),
                h.AriaHidden(true),
            ]),
            h.div(
                [],
                [
                    h.div([h.Class("font-mono text-xs font-semibold")], [name]),
                    h.div(
                        [h.Class("mt-1 text-xs text-muted-foreground")],
                        [state]
                    ),
                ]
            ),
        ]
    )
}

const wait_view = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DeferredDemo.wait_snapshot(model)

    const consumer_tone =
        model.waitStep === "Resolved"
            ? "ready"
            : model.waitStep === "Waiting"
              ? "waiting"
              : "idle"

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.85fr_1.15fr]")],
        [
            panel(
                "Lifecycle",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Empty", "Waiting", "Resolved"] as const).map(
                                    (waitStep) =>
                                        choice_button(
                                            waitStep,
                                            model.waitStep === waitStep,
                                            DeferredDemo.Message.SelectedDeferredWaitStep(
                                                {
                                                    waitStep,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("state", snapshot.state, h, "cyan"),
                                    metric(
                                        "isDone",
                                        String(snapshot.isDone),
                                        h,
                                        snapshot.isDone ? "green" : "amber"
                                    ),
                                    metric("poll", snapshot.poll, h),
                                    metric(
                                        "waiters",
                                        String(snapshot.waiterCount),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "isDeferred",
                                String(snapshot.isDeferred),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Fiber coordination",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "mb-1 flex items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-cyan-600"
                                            ),
                                        ],
                                        ["Deferred<string>"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        [
                                            snapshot.completion === "—"
                                                ? "empty"
                                                : `stored: ${snapshot.completion}`,
                                        ]
                                    ),
                                ]
                            ),
                            fiber_row(
                                "consumer A",
                                snapshot.consumerA,
                                consumer_tone,
                                h
                            ),
                            fiber_row(
                                "consumer B",
                                snapshot.consumerB,
                                consumer_tone,
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2"
                                    ),
                                ],
                                [
                                    h.div([h.Class("h-px bg-border")]),
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.waitStep === "Resolved"
                                                ? "completion resumes all"
                                                : "both await same cell",
                                        ]
                                    ),
                                    h.div([h.Class("h-px bg-border")]),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.waitStep === "Waiting"
                                        ? "Both fibers are suspended by Deferred.await. No thread is blocked and no polling loop is needed."
                                        : model.waitStep === "Resolved"
                                          ? "One completion publishes one Effect result. Existing and future awaiters all observe it."
                                          : "The Deferred exists but has no completion and no registered consumers yet.",
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

const complete_view = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DeferredDemo.complete_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Race order",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "A → B",
                                        model.completionOrder === "AFirst",
                                        DeferredDemo.Message.SelectedDeferredCompletionOrder(
                                            {
                                                completionOrder: "AFirst",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "B → A",
                                        model.completionOrder === "BFirst",
                                        DeferredDemo.Message.SelectedDeferredCompletionOrder(
                                            {
                                                completionOrder: "BFirst",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "first producer",
                                snapshot.firstProducer,
                                h,
                                "cyan"
                            ),
                            metric(
                                "first completion",
                                String(snapshot.firstAttempt),
                                h,
                                "green"
                            ),
                            metric(
                                "second completion",
                                String(snapshot.secondAttempt),
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "One-shot cell",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-3")],
                                [
                                    metric(
                                        "winner",
                                        snapshot.firstProducer,
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "stored value",
                                        snapshot.storedValue,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "isDone",
                                        String(snapshot.isDone),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "grid gap-3 md:grid-cols-[1fr_auto_1fr]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        [snapshot.firstProducer]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-emerald-600"
                                                            ),
                                                        ],
                                                        ["succeed(...) → true"]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "self-center font-mono text-cyan-600"
                                                    ),
                                                ],
                                                ["→"]
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
                                                        [snapshot.storedValue]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["stored exactly once"]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    `${snapshot.secondProducer} arrives later: succeed(...) → false. It cannot replace the winner.`,
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

const outcome_tone = (
    outcome: DeferredDemo.Outcome
): "green" | "amber" | "red" | "cyan" =>
    outcome === "Success"
        ? "green"
        : outcome === "Failure"
          ? "amber"
          : outcome === "Defect"
            ? "red"
            : "cyan"

const outcomes_view = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DeferredDemo.outcome_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.9fr_1.1fr]")],
        [
            panel(
                "Completion channel",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Success",
                                        "Failure",
                                        "Defect",
                                        "Interrupt",
                                    ] as const
                                ).map((outcome) =>
                                    choice_button(
                                        outcome,
                                        model.outcome === outcome,
                                        DeferredDemo.Message.SelectedDeferredOutcome(
                                            {
                                                outcome,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("API", snapshot.api, h, "cyan"),
                            metric(
                                "completion won",
                                String(snapshot.completionWon),
                                h,
                                "green"
                            ),
                            metric(
                                "isDone",
                                String(snapshot.isDone),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "What await observes",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-3")],
                                [
                                    metric(
                                        "channel",
                                        snapshot.awaitChannel,
                                        h,
                                        outcome_tone(model.outcome)
                                    ),
                                    metric("value", snapshot.awaitValue, h),
                                    metric("typed E", snapshot.errorType, h),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    h.div([], ["Deferred<number, string>"]),
                                    h.div(
                                        [h.Class("text-muted-foreground")],
                                        ["           │"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                outcome_tone(model.outcome) ===
                                                    "green"
                                                    ? "text-emerald-600"
                                                    : outcome_tone(
                                                            model.outcome
                                                        ) === "amber"
                                                      ? "text-amber-600"
                                                      : outcome_tone(
                                                              model.outcome
                                                          ) === "red"
                                                        ? "text-red-600"
                                                        : "text-cyan-600"
                                            ),
                                        ],
                                        [
                                            `           └─ await → ${snapshot.awaitChannel}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.outcome === "Failure"
                                        ? "Typed failures travel through E and can be handled with ordinary Effect recovery."
                                        : model.outcome === "Success"
                                          ? "Success resumes every waiter with the same A value."
                                          : "Defects and interruption are part of Effect's full Cause, not values added to the typed E channel.",
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

const memo_view = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DeferredDemo.memo_snapshot(model)

    const is_complete = model.memoMode === "Complete"

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Completion mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "complete",
                                        is_complete,
                                        DeferredDemo.Message.SelectedDeferredMemoMode(
                                            {
                                                memoMode: "Complete",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "completeWith",
                                        !is_complete,
                                        DeferredDemo.Message.SelectedDeferredMemoMode(
                                            {
                                                memoMode: "CompleteWith",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "completion won",
                                String(snapshot.completionWon),
                                h,
                                "green"
                            ),
                            metric(
                                "evaluations after completion",
                                String(snapshot.evaluationsAfterCompletion),
                                h,
                                is_complete ? "green" : "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    is_complete
                                        ? "complete evaluates source during completion, then stores that memoized Exit."
                                        : "completeWith stores source directly; completion itself does not run source.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Two awaiters",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["awaiter 1"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 font-mono text-xl font-semibold"
                                                    ),
                                                ],
                                                [String(snapshot.firstAwait)]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `source evaluations: ${snapshot.evaluationsAfterFirstAwait}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["awaiter 2"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 font-mono text-xl font-semibold"
                                                    ),
                                                ],
                                                [String(snapshot.secondAwait)]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `source evaluations: ${snapshot.evaluationsAfterSecondAwait}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            metric(
                                "final source evaluations",
                                String(snapshot.evaluationsAfterSecondAwait),
                                h,
                                is_complete ? "green" : "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    is_complete
                                        ? "Both awaiters see 1 because source ran once before the Deferred was published."
                                        : "The awaiters see 1 then 2 because each await executes the stored Effect independently.",
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

const notice_panel = <ParentMessage>(
    details: DeferredDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: DeferredDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = DeferredDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / Deferred"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["One result, many waiting fibers"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Walk a Deferred from empty coordination cell to shared completion, then compare result channels and the subtle difference between complete and completeWith.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["one-shot"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["multi-waiter"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Effect<A, E>"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Wait"
                ? wait_view(model, to_parent_message, h)
                : model.stage === "Complete"
                  ? complete_view(model, to_parent_message, h)
                  : model.stage === "Outcomes"
                    ? outcomes_view(model, to_parent_message, h)
                    : memo_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
