import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MetricDemo from "./metric.ts"

type ToParentMessage<ParentMessage> = (
    message: MetricDemo.Message
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

const metric_card = <ParentMessage>(
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
    message: MetricDemo.Message,
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
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Metric examples"),
        ],
        MetricDemo.stages.map((stage: MetricDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MetricDemo.Message.SelectedMetricStage({ stage })
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
    details: MetricDemo.StageDetails,
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

const types_label = (value: MetricDemo.TypesCase): string =>
    value === "AllValues"
        ? "all values"
        : value === "InputState"
          ? "input / state"
          : value.toLowerCase()

const types_view = <ParentMessage>(
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MetricDemo.types_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Metric families",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Primitive",
                                        "States",
                                        "InputState",
                                    ] as const
                                ).map((typesCase: MetricDemo.TypesCase) =>
                                    choice_button(
                                        types_label(typesCase),
                                        model.typesCase === typesCase,
                                        MetricDemo.Message.SelectedMetricTypesCase(
                                            {
                                                typesCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric_card(
                                "primitive types",
                                snapshot.primitiveTypes,
                                h,
                                "cyan"
                            ),
                            metric_card("Metric.Type", snapshot.typeUnion, h),
                            metric_card("timer", snapshot.timer, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Type channels",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric_card(
                                "state shapes",
                                snapshot.stateShapes,
                                h,
                                "green"
                            ),
                            metric_card(
                                "Input / State helpers",
                                snapshot.inputState,
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
                                    "Metric<Input, State> separates what callers record from what readers observe. Each primitive fixes those channels to a state shape appropriate for its aggregation model.",
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

const record_view = <ParentMessage>(
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MetricDemo.record_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Recording mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Update", "Modify", "Transform"] as const
                                ).map((recordCase: MetricDemo.RecordCase) =>
                                    choice_button(
                                        recordCase.toLowerCase(),
                                        model.recordCase === recordCase,
                                        MetricDemo.Message.SelectedMetricRecordCase(
                                            {
                                                recordCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric_card(
                                "counter",
                                snapshot.counter,
                                h,
                                "green"
                            ),
                            metric_card("gauge", snapshot.gauge, h, "cyan"),
                            metric_card("isMetric", String(snapshot.guard), h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Other inputs",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric_card("frequency", snapshot.frequency, h),
                            metric_card(
                                "histogram",
                                snapshot.histogram,
                                h,
                                "green"
                            ),
                            metric_card(
                                "input transforms",
                                snapshot.transform,
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

const attributes_view = <ParentMessage>(
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MetricDemo.attributes_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Attribute source",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Metric", "Context", "Registry"] as const
                                ).map(
                                    (
                                        attributesCase: MetricDemo.AttributesCase
                                    ) =>
                                        choice_button(
                                            attributesCase.toLowerCase(),
                                            model.attributesCase ===
                                                attributesCase,
                                            MetricDemo.Message.SelectedMetricAttributesCase(
                                                {
                                                    attributesCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric_card("direct", snapshot.direct, h, "cyan"),
                            metric_card(
                                "contextual",
                                snapshot.contextual,
                                h,
                                "green"
                            ),
                            metric_card("accepted forms", snapshot.forms, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Registry identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric_card(
                                "MetricRegistry",
                                snapshot.registry,
                                h,
                                "cyan"
                            ),
                            metric_card("series", snapshot.series, h, "green"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Attributes participate in series identity. The same metric id can therefore accumulate independently for production, staging, regions, methods, tenants, or any other string dimensions.",
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

const observe_label = (value: MetricDemo.ObserveCase): string =>
    value.toLowerCase()

const observe_view = <ParentMessage>(
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MetricDemo.observe_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Histogram boundaries",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Boundaries",
                                        "Snapshot",
                                        "Runtime",
                                    ] as const
                                ).map((observeCase: MetricDemo.ObserveCase) =>
                                    choice_button(
                                        observe_label(observeCase),
                                        model.observeCase === observeCase,
                                        MetricDemo.Message.SelectedMetricObserveCase(
                                            {
                                                observeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric_card(
                                "normalized",
                                snapshot.normalized,
                                h,
                                "cyan"
                            ),
                            metric_card("linear", snapshot.linear, h, "green"),
                            metric_card("exponential", snapshot.exponential, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Observability surface",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric_card(
                                "snapshot",
                                snapshot.snapshot,
                                h,
                                "green"
                            ),
                            metric_card("dump", snapshot.dump, h),
                            metric_card(
                                "runtime metrics",
                                snapshot.runtime,
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
    details: MetricDemo.StageDetails,
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
    model: MetricDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = MetricDemo.stage_details[model.stage]

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
                                        ["effect / Metric"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Typed measurements, attributed series, and runtime observation",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Record counters, gauges, frequencies, histograms, summaries, and durations; shape their inputs, add dimensions, inspect the registry, and optionally collect fiber runtime metrics.",
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
                                        ["51 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["5 primitives + timer"]
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
            model.stage === "Types"
                ? types_view(model, to_parent_message, h)
                : model.stage === "Record"
                  ? record_view(model, to_parent_message, h)
                  : model.stage === "Attributes"
                    ? attributes_view(model, to_parent_message, h)
                    : observe_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
