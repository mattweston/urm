import * as Ui from "@foldkit/ui"
import type { ButtonAttributes } from "@foldkit/ui/button"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ExecutionPlanDemo from "./execution-plan.ts"

type ToParentMessage<ParentMessage> = (
    message: ExecutionPlanDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: ExecutionPlanDemo.Stage,
    model: ExecutionPlanDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ExecutionPlanDemo.Message.SelectedExecutionPlanStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes: ButtonAttributes<ParentMessage>) =>
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
    model: ExecutionPlanDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect ExecutionPlan examples"),
        ],
        ExecutionPlanDemo.stages.map((stage: ExecutionPlanDemo.Stage) =>
            stage_button(stage, model, to_parent_message, h)
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

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api: string) =>
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
                        "mt-1 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
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
    message: ExecutionPlanDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes: ButtonAttributes<ParentMessage>) =>
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
    details: ExecutionPlanDemo.StageDetails,
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

const step_card = <ParentMessage>(
    step: ExecutionPlanDemo.StepSnapshot,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
                [
                    h.div(
                        [h.Class("font-mono text-sm font-semibold")],
                        [`step ${step.index}`]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-700"
                            ),
                        ],
                        [step.backend]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-4 grid grid-cols-3 gap-2 text-xs")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded border border-border bg-card px-2 py-2"
                            ),
                        ],
                        [`attempts: ${step.attempts}`]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded border border-border bg-card px-2 py-2"
                            ),
                        ],
                        [`while: ${step.hasWhile ? "yes" : "no"}`]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded border border-border bg-card px-2 py-2"
                            ),
                        ],
                        [`schedule: ${step.hasSchedule ? "yes" : "no"}`]
                    ),
                ]
            ),
        ]
    )

const steps_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = ExecutionPlanDemo.steps_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.72fr_1.28fr]")],
        [
            panel(
                "Plan identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("TypeId", snapshot.typeId, h, "cyan"),
                            metric(
                                "isExecutionPlan",
                                String(snapshot.isExecutionPlan),
                                h,
                                "green"
                            ),
                            metric("step count", String(snapshot.stepCount), h),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Ordered steps",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        snapshot.steps.map(
                            (step: ExecutionPlanDemo.StepSnapshot) =>
                                step_card(step, h)
                        )
                    ),
                ],
                h
            ),
        ]
    )
}

const run_case_label = (runCase: ExecutionPlanDemo.RunCase): string =>
    runCase === "FirstSuccess"
        ? "primary succeeds"
        : runCase === "FallbackSuccess"
          ? "fallback succeeds"
          : "plan exhausted"

const run_view = <ParentMessage>(
    model: ExecutionPlanDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ExecutionPlanDemo.run_snapshot(model)

    const success = snapshot.exitTag === "Success"

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Workflow outcome",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "FirstSuccess",
                                        "FallbackSuccess",
                                        "Exhausted",
                                    ] as const
                                ).map((runCase: ExecutionPlanDemo.RunCase) =>
                                    choice_button(
                                        run_case_label(runCase),
                                        model.runCase === runCase,
                                        ExecutionPlanDemo.Message.SelectedExecutionPlanRunCase(
                                            {
                                                runCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "Exit",
                                snapshot.exitTag,
                                h,
                                success ? "green" : "amber"
                            ),
                            metric(
                                "result",
                                snapshot.result,
                                h,
                                success ? "cyan" : "amber"
                            ),
                            metric(
                                "attempts run",
                                String(snapshot.attemptCount),
                                h
                            ),
                            metric("final step", snapshot.finalStep, h),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "CurrentMetadata reads",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "inside workflow",
                                snapshot.metadataReads,
                                h,
                                "cyan"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The workflow does not branch on a separately passed retry counter. It reads ExecutionPlan.CurrentMetadata from the active fiber and Backend from the step-provided Context.",
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

const event_tone = (
    tag: ExecutionPlanDemo.StableEvent["tag"]
): "green" | "amber" | "cyan" =>
    tag === "AttemptSuccess"
        ? "green"
        : tag === "AttemptFailure"
          ? "amber"
          : "cyan"

const event_row = <ParentMessage>(
    event: ExecutionPlanDemo.StableEvent,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "grid grid-cols-[8rem_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-background/70 px-3 py-2.5"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        event_tone(event.tag) === "green"
                            ? "font-mono text-xs font-semibold text-emerald-600"
                            : event_tone(event.tag) === "amber"
                              ? "font-mono text-xs font-semibold text-amber-600"
                              : "font-mono text-xs font-semibold text-cyan-600"
                    ),
                ],
                [event.tag]
            ),
            h.div(
                [h.Class("font-mono text-[11px]")],
                [`attempt ${event.attempt}`]
            ),
            h.div(
                [h.Class("font-mono text-[11px]")],
                [`step ${event.stepIndex}`]
            ),
            h.div(
                [h.Class("font-mono text-[11px]")],
                [`stepTry ${event.stepAttempt}`]
            ),
        ]
    )

const events_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = ExecutionPlanDemo.events_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.7fr_1.3fr]")],
        [
            panel(
                "Metadata",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "outside a plan",
                                snapshot.defaultMetadata,
                                h
                            ),
                            metric(
                                "workflow reads",
                                snapshot.metadataReads.join("\n"),
                                h,
                                "cyan"
                            ),
                            metric("final result", snapshot.result, h, "green"),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Lifecycle events",
                [
                    h.div(
                        [h.Class("space-y-2 p-5")],
                        snapshot.events.map(
                            (
                                event: ExecutionPlanDemo.StableEvent,
                                index: number
                            ) =>
                                h.keyed("div")(
                                    `${index}-${event.tag}`,
                                    [],
                                    [event_row(event, h)]
                                )
                        )
                    ),
                ],
                h
            ),
        ]
    )
}

const merge_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = ExecutionPlanDemo.merge_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "merge",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "plan A",
                                        `${snapshot.firstSteps} steps`,
                                        h
                                    ),
                                    metric(
                                        "plan B",
                                        `${snapshot.secondSteps} steps`,
                                        h
                                    ),
                                    metric(
                                        "merged",
                                        `${snapshot.mergedSteps} steps`,
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric(
                                "merged order",
                                snapshot.mergedOrder,
                                h,
                                "cyan"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "ExecutionPlan.merge concatenates the step arrays; it does not interleave or normalize them.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "captureRequirements",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "captured is plan",
                                        String(snapshot.capturedIsPlan),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "captured steps",
                                        String(snapshot.capturedSteps),
                                        h
                                    ),
                                    metric(
                                        "RetryGate captured",
                                        String(snapshot.gateValueCaptured),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "run without RetryGate",
                                        snapshot.runWithoutGate,
                                        h,
                                        "cyan"
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
                                    "The original while predicate requires RetryGate. captureRequirements is evaluated while RetryGate is provided, then the captured plan runs later without that service.",
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
    details: ExecutionPlanDemo.StageDetails,
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
    model: ExecutionPlanDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ExecutionPlanDemo.stage_details[model.stage]

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
                                        ["effect / ExecutionPlan"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Ordered retries with changing resources",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Define resource-backed fallback steps, run one workflow through them, inspect stable attempt metadata, then compose and close over plan requirements.",
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
                                        ["14 documented entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["ordered failover"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["no explicit any"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),

            stage_tabs(model, to_parent_message, h),

            intro_panel(details, h),

            model.stage === "Steps"
                ? steps_view(h)
                : model.stage === "Run"
                  ? run_view(model, to_parent_message, h)
                  : model.stage === "Events"
                    ? events_view(h)
                    : merge_view(h),

            notice_panel(details, h),
        ]
    )
}
