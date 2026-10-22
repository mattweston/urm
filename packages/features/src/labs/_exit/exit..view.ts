import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ExitDemo from "./exit.ts"

type ToParentMessage<ParentMessage> = (
    message: ExitDemo.Message
) => ParentMessage

type ButtonAttribute<ParentMessage> =
    Parameters<HtmlBuilder<ParentMessage>["button"]>[0] extends ReadonlyArray<
        infer Attribute
    >
        ? Attribute
        : never

type ButtonViewAttributes<ParentMessage> = Readonly<{
    button: ReadonlyArray<ButtonAttribute<ParentMessage>>
}>

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: ExitDemo.Stage,
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ExitDemo.Message.SelectedExitStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
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
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Exit examples"),
        ],
        ExitDemo.stages.map((stage: ExitDemo.Stage) =>
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
    message: ExitDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
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
    details: ExitDemo.StageDetails,
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

const outcome_tone = (
    outcomeCase: ExitDemo.OutcomeCase
): "green" | "amber" | "red" | "cyan" =>
    outcomeCase === "Success"
        ? "green"
        : outcomeCase === "Failure"
          ? "amber"
          : outcomeCase === "Defect"
            ? "red"
            : "cyan"

const outcomes_view = <ParentMessage>(
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ExitDemo.outcome_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Outcome",
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
                                ).map((outcomeCase: ExitDemo.OutcomeCase) =>
                                    choice_button(
                                        outcomeCase,
                                        model.outcomeCase === outcomeCase,
                                        ExitDemo.Message.SelectedExitOutcomeCase(
                                            {
                                                outcomeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "_tag",
                                snapshot.tag,
                                h,
                                outcome_tone(model.outcomeCase)
                            ),
                            metric("success value", snapshot.value, h),
                            metric("first typed error", snapshot.typedError, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Cause channels + Effect protocol",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "hasFails",
                                        String(snapshot.hasFails),
                                        h,
                                        snapshot.hasFails ? "amber" : "default"
                                    ),
                                    metric(
                                        "hasDies",
                                        String(snapshot.hasDies),
                                        h,
                                        snapshot.hasDies ? "red" : "default"
                                    ),
                                    metric(
                                        "hasInterrupts",
                                        String(snapshot.hasInterrupts),
                                        h,
                                        snapshot.hasInterrupts
                                            ? "cyan"
                                            : "default"
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Effect.isEffect",
                                        String(snapshot.isEffect),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "run as Effect",
                                        snapshot.runAsEffect,
                                        h,
                                        snapshot.tag === "Success"
                                            ? "green"
                                            : "amber"
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
                                    "Exit is completed result data and also implements Effect. A Success can run or yield directly; a Failure replays its stored Cause through Effect.",
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

const inspect_view = <ParentMessage>(
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ExitDemo.inspect_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Narrow",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Success", "Failure", "Defect"] as const).map(
                                    (inspectCase: ExitDemo.InspectCase) =>
                                        choice_button(
                                            inspectCase,
                                            model.inspectCase === inspectCase,
                                            ExitDemo.Message.SelectedExitInspectCase(
                                                {
                                                    inspectCase,
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
                                    metric(
                                        "isExit",
                                        String(snapshot.isExit),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "isSuccess",
                                        String(snapshot.isSuccess),
                                        h
                                    ),
                                    metric(
                                        "isFailure",
                                        String(snapshot.isFailure),
                                        h
                                    ),
                                    metric(
                                        "match",
                                        snapshot.matched,
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Optional views",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "hasFails",
                                        String(snapshot.hasFails),
                                        h
                                    ),
                                    metric(
                                        "hasDies",
                                        String(snapshot.hasDies),
                                        h
                                    ),
                                    metric(
                                        "hasInterrupts",
                                        String(snapshot.hasInterrupts),
                                        h
                                    ),
                                ]
                            ),
                            metric("getSuccess", snapshot.successOption, h),
                            metric("getCause", snapshot.causeOption, h),
                            metric("findErrorOption", snapshot.errorOption, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_view = <ParentMessage>(
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ExitDemo.transform_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Transform case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Success", "Failure", "All"] as const).map(
                                    (transformCase: ExitDemo.TransformCase) =>
                                        choice_button(
                                            transformCase === "All"
                                                ? "asVoidAll"
                                                : transformCase,
                                            model.transformCase ===
                                                transformCase,
                                            ExitDemo.Message.SelectedExitTransformCase(
                                                {
                                                    transformCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("source", snapshot.source, h),
                            metric("operation", snapshot.operation, h, "cyan"),
                            metric("items", String(snapshot.allCount), h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Transformed Exit",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "result",
                                snapshot.result,
                                h,
                                snapshot.allHasFails ? "amber" : "green"
                            ),
                            metric(
                                "cause / void detail",
                                snapshot.causeKinds,
                                h
                            ),
                            metric(
                                "contains typed failure",
                                String(snapshot.allHasFails),
                                h,
                                snapshot.allHasFails ? "amber" : "default"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const extract_view = <ParentMessage>(
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ExitDemo.extract_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.72fr_1.28fr]")],
        [
            panel(
                "Exit shape",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Success", "Failure", "Defect"] as const).map(
                                    (extractCase: ExitDemo.ExtractCase) =>
                                        choice_button(
                                            extractCase,
                                            model.extractCase === extractCase,
                                            ExitDemo.Message.SelectedExitExtractCase(
                                                {
                                                    extractCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("Exit tag", snapshot.exitTag, h, "cyan"),
                            metric(
                                "filterValue payload",
                                snapshot.requestedValue,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Result-based extractors",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-2 gap-3 md:grid-cols-3"
                                    ),
                                ],
                                [
                                    metric(
                                        "filterSuccess",
                                        snapshot.filterSuccess,
                                        h
                                    ),
                                    metric(
                                        "filterValue",
                                        snapshot.filterValue,
                                        h
                                    ),
                                    metric(
                                        "filterFailure",
                                        snapshot.filterFailure,
                                        h
                                    ),
                                    metric(
                                        "filterCause",
                                        snapshot.filterCause,
                                        h
                                    ),
                                    metric("findError", snapshot.findError, h),
                                    metric(
                                        "findDefect",
                                        snapshot.findDefect,
                                        h
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
                                    "Result.Success means the requested shape/value was found. Result.Failure preserves the rejected Exit branch as ordinary data for further filtering.",
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
    details: ExitDemo.StageDetails,
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
    model: ExitDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ExitDemo.stage_details[model.stage]

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
                                        ["effect / Exit"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Completed Effect outcomes as inspectable data",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Construct all result channels, inspect full Cause information, transform completed values synchronously, and extract branches through Option or Result.",
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
                                        ["31 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Cause preserved"]
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
            model.stage === "Outcomes"
                ? outcomes_view(model, to_parent_message, h)
                : model.stage === "Inspect"
                  ? inspect_view(model, to_parent_message, h)
                  : model.stage === "Transform"
                    ? transform_view(model, to_parent_message, h)
                    : extract_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
