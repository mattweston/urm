import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as DurationDemo from "./duration.ts"

type ToParentMessage<ParentMessage> = (
    message: DurationDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: DurationDemo.Stage,
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                DurationDemo.Message.SelectedDurationStage({ stage })
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
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Duration examples"),
        ],
        DurationDemo.stages.map((stage) =>
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
    message: DurationDemo.Message,
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
    details: DurationDemo.StageDetails,
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

const build_view = <ParentMessage>(
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DurationDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Duration.Input",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "String",
                                        "Object",
                                        "Nanos",
                                        "Infinity",
                                        "Invalid",
                                    ] as const
                                ).map((buildCase) =>
                                    choice_button(
                                        buildCase,
                                        model.buildCase === buildCase,
                                        DurationDemo.Message.SelectedDurationBuildCase(
                                            {
                                                buildCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("input", snapshot.input, h, "cyan"),
                            metric(
                                "fromInput",
                                snapshot.decoded ? "Some(Duration)" : "None",
                                h,
                                snapshot.decoded ? "green" : "amber"
                            ),
                            metric(
                                "isDuration",
                                snapshot.isDuration,
                                h,
                                snapshot.decoded ? "green" : "default"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Normalized value",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric(
                                        "value._tag",
                                        snapshot.tag,
                                        h,
                                        "cyan"
                                    ),
                                    metric("format", snapshot.formatted, h),
                                    metric("toMillis", snapshot.millis, h),
                                    metric("finite", snapshot.finite, h),
                                ]
                            ),
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric("positive", snapshot.positive, h),
                                    metric("negative", snapshot.negative, h),
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
                                        ["representation"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs leading-6"
                                            ),
                                        ],
                                        [
                                            snapshot.decoded
                                                ? `DurationValue.${snapshot.tag}`
                                                : "no Duration produced",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            snapshot.decoded
                                                ? "Different input shapes normalize into the same immutable Duration abstraction."
                                                : "Invalid external input stays in Option.none instead of throwing.",
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

const convert_view = <ParentMessage>(
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DurationDemo.convert_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Choose a span",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Complex",
                                        "SubMillisecond",
                                        "Infinity",
                                        "Negative",
                                    ] as const
                                ).map((convertCase) =>
                                    choice_button(
                                        convertCase === "SubMillisecond"
                                            ? "Sub-ms"
                                            : convertCase,
                                        model.convertCase === convertCase,
                                        DurationDemo.Message.SelectedDurationConvertCase(
                                            {
                                                convertCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("format", snapshot.formatted, h, "cyan"),
                            metric("storage tag", snapshot.tag, h),
                            metric(
                                "toNanos",
                                snapshot.nanos,
                                h,
                                snapshot.nanos === "None" ? "amber" : "green"
                            ),
                            metric("toHrTime", snapshot.hrtime, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Views of the same span",
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
                                    metric("milliseconds", snapshot.millis, h),
                                    metric("seconds", snapshot.seconds, h),
                                    metric("minutes", snapshot.minutes, h),
                                    metric("hours", snapshot.hours, h),
                                    metric("days", snapshot.days, h),
                                    metric("weeks", snapshot.weeks, h),
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
                                        ["Duration.parts"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [`days: ${snapshot.parts.days}`]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `hours: ${snapshot.parts.hours}`,
                                                ]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `minutes: ${snapshot.parts.minutes}`,
                                                ]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `seconds: ${snapshot.parts.seconds}`,
                                                ]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `millis: ${snapshot.parts.millis}`,
                                                ]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `nanos: ${snapshot.parts.nanos}`,
                                                ]
                                            ),
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

const math_view = <ParentMessage>(
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DurationDemo.math_snapshot(model)

    const result_tone = model.mathCase === "Subtract" ? "amber" : "green"

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Operation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Sum",
                                        "Subtract",
                                        "Times",
                                        "Divide",
                                        "Infinity",
                                    ] as const
                                ).map((mathCase) =>
                                    choice_button(
                                        mathCase,
                                        model.mathCase === mathCase,
                                        DurationDemo.Message.SelectedDurationMathCase(
                                            {
                                                mathCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "expression",
                                snapshot.expression,
                                h,
                                "cyan"
                            ),
                            metric("API result mode", snapshot.safe, h),
                            metric("result tag", snapshot.resultTag, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Arithmetic",
                [
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    metric("left", snapshot.left, h),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center font-mono text-xl font-semibold text-cyan-600"
                                            ),
                                        ],
                                        [snapshot.operator]
                                    ),
                                    metric("right", snapshot.right, h),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center font-mono text-xl font-semibold text-muted-foreground"
                                            ),
                                        ],
                                        ["="]
                                    ),
                                    metric(
                                        "result",
                                        snapshot.result,
                                        h,
                                        result_tone
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [snapshot.note]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "abs(result)",
                                        model.mathCase === "Subtract"
                                            ? "2s"
                                            : snapshot.result,
                                        h
                                    ),
                                    metric(
                                        "negate example",
                                        model.mathCase === "Infinity"
                                            ? "negate(Infinity) → -Infinity"
                                            : "sign is preserved explicitly",
                                        h
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

const compare_view = <ParentMessage>(
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DurationDemo.compare_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.88fr_1.12fr]")],
        [
            panel(
                "Range",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Below", "Inside", "Above"] as const).map(
                                    (compareCase) =>
                                        choice_button(
                                            compareCase,
                                            model.compareCase === compareCase,
                                            DurationDemo.Message.SelectedDurationCompareCase(
                                                {
                                                    compareCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric("minimum", snapshot.minimum, h),
                                    metric("value", snapshot.value, h, "cyan"),
                                    metric("maximum", snapshot.maximum, h),
                                ]
                            ),
                            metric(
                                "between?",
                                String(snapshot.between),
                                h,
                                snapshot.between ? "green" : "amber"
                            ),
                            metric("clamped", snapshot.clamped, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Order(value, min)",
                                        String(snapshot.orderVsMinimum),
                                        h
                                    ),
                                    metric(
                                        "Order(value, max)",
                                        String(snapshot.orderVsMaximum),
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Reusable strategies",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "min(value, max)",
                                        snapshot.minWithMaximum,
                                        h
                                    ),
                                    metric(
                                        "max(value, min)",
                                        snapshot.maxWithMinimum,
                                        h
                                    ),
                                    metric(
                                        "5s ≡ 5000ms",
                                        String(snapshot.equivalentUnits),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "ReducerSum",
                                        snapshot.reducerSum,
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "CombinerMin",
                                        snapshot.combinerMin,
                                        h
                                    ),
                                    metric(
                                        "CombinerMax",
                                        snapshot.combinerMax,
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
                                    "Aggregate input: 250ms, 1s, 2.5s. ReducerSum folds from zero; the combiners keep the shortest or longest member.",
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
    details: DurationDemo.StageDetails,
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
    model: DurationDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = DurationDemo.stage_details[model.stage]

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
                                        ["effect / Duration"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Time spans from nanoseconds to infinity",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Decode flexible inputs, inspect precision, perform signed arithmetic, and compare or aggregate immutable Duration values.",
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
                                        ["57 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["nanosecond precision"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["±Infinity"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Build"
                ? build_view(model, to_parent_message, h)
                : model.stage === "Convert"
                  ? convert_view(model, to_parent_message, h)
                  : model.stage === "Math"
                    ? math_view(model, to_parent_message, h)
                    : compare_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
