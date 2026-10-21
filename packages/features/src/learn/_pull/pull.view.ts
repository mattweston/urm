import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as PullDemo from "./pull.ts"

type ToParentMessage<ParentMessage> = (
    message: PullDemo.Message
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
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${toneClass}`
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
    active: boolean,
    message: PullDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Pull examples"),
        ],
        PullDemo.stages.map((stage: PullDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        PullDemo.Message.SelectedPullStage({
                            stage,
                        })
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
        )
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

const intro_panel = <ParentMessage>(
    details: PullDemo.StageDetails,
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

const model_view = <ParentMessage>(
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PullDemo.model_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Pull model",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Pull", "Types", "Done"] as const).map(
                                    (modelCase: PullDemo.ModelCase) =>
                                        choice_button(
                                            modelCase.toLowerCase(),
                                            model.modelCase === modelCase,
                                            PullDemo.Message.SelectedPullModelCase(
                                                {
                                                    modelCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("type equation", snapshot.model, h, "cyan"),
                            metric("success", snapshot.success, h, "green"),
                            metric(
                                "ordinary failure",
                                snapshot.failure,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Completion + extractors",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Done", snapshot.done, h, "green"),
                            metric(
                                "type extractors",
                                snapshot.extractors,
                                h,
                                "cyan"
                            ),
                            metric("runtime overhead", snapshot.services, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const detect_view = <ParentMessage>(
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PullDemo.detect_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Done detection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Cause", "Reason", "Exclude"] as const).map(
                                    (detectCase: PullDemo.DetectCase) =>
                                        choice_button(
                                            detectCase.toLowerCase(),
                                            model.detectCase === detectCase,
                                            PullDemo.Message.SelectedPullDetectCase(
                                                {
                                                    detectCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "Done cause?",
                                String(snapshot.doneCause),
                                h,
                                "green"
                            ),
                            metric(
                                "ordinary cause?",
                                String(snapshot.normalCause),
                                h,
                                "amber"
                            ),
                            metric(
                                "Done reason?",
                                String(snapshot.doneReason),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Signal shape",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Done _tag", snapshot.tag, h, "cyan"),
                            metric(
                                "ExcludeDone",
                                snapshot.excludes,
                                h,
                                "green"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Detection answers whether completion is present. Filtering decides whether that completion is clean or mixed with a real failure.",
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

const filter_view = <ParentMessage>(
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PullDemo.filter_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Cause filters",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Done", "Leftover", "NoDone"] as const).map(
                                    (filterCase: PullDemo.FilterCase) =>
                                        choice_button(
                                            filterCase.toLowerCase(),
                                            model.filterCase === filterCase,
                                            PullDemo.Message.SelectedPullFilterCase(
                                                {
                                                    filterCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("filterDone", snapshot.done, h, "green"),
                            metric(
                                "filterDoneLeftover",
                                snapshot.leftover,
                                h,
                                "cyan"
                            ),
                            metric("filterNoDone", snapshot.noDone, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Mixed cause rule",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "Done + real failure",
                                snapshot.mixed,
                                h,
                                "amber"
                            ),
                            metric(
                                "void payload variant",
                                snapshot.voidVariant,
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
                                    "Normal completion never hides a genuine failure. When both are present, the Done reason is removed and the remaining failure Cause survives.",
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

const match_view = <ParentMessage>(
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PullDemo.match_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Three-way handling",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Match", "Catch", "Exit"] as const).map(
                                    (matchCase: PullDemo.MatchCase) =>
                                        choice_button(
                                            matchCase.toLowerCase(),
                                            model.matchCase === matchCase,
                                            PullDemo.Message.SelectedPullMatchCase(
                                                {
                                                    matchCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "success branch",
                                snapshot.success,
                                h,
                                "green"
                            ),
                            metric("Done branch", snapshot.done, h, "cyan"),
                            metric("catchDone", snapshot.catchDone, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Completion conversion",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "doneExitFromCause",
                                snapshot.exit,
                                h,
                                "green"
                            ),
                            metric(
                                "current integration",
                                snapshot.realUse,
                                h,
                                "cyan"
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
    details: PullDemo.StageDetails,
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
    model: PullDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = PullDemo.stage_details[model.stage]

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
                                        ["effect / Pull"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Low-level stream pulls with graceful Done separated from real failure",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Model one pull step, detect Cause.Done completion, filter completion away from genuine failures, and explicitly match or recover all three outcomes.",
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
                                        ["15 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["value · error · done"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["strict typing"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Model"
                ? model_view(model, to_parent_message, h)
                : model.stage === "Detect"
                  ? detect_view(model, to_parent_message, h)
                  : model.stage === "Filter"
                    ? filter_view(model, to_parent_message, h)
                    : match_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
