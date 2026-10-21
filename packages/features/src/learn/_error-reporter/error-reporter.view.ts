import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ErrorReporterDemo from "./error-reporter.ts"

type ToParentMessage<ParentMessage> = (
    message: ErrorReporterDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: ErrorReporterDemo.Stage,
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ErrorReporterDemo.Message.SelectedErrorReporterStage({ stage })
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
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect ErrorReporter examples"),
        ],
        ErrorReporterDemo.stages.map((stage: ErrorReporterDemo.Stage) =>
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
    message: ErrorReporterDemo.Message,
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
    details: ErrorReporterDemo.StageDetails,
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

const capture_view = <ParentMessage>(
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ErrorReporterDemo.capture_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Reporting entry point",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Failure", "Defect", "Manual"] as const).map(
                                    (
                                        captureCase: ErrorReporterDemo.CaptureCase
                                    ) =>
                                        choice_button(
                                            captureCase,
                                            model.captureCase === captureCase,
                                            ErrorReporterDemo.Message.SelectedErrorReporterCaptureCase(
                                                {
                                                    captureCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("source", snapshot.source, h, "cyan"),
                            metric("Effect outcome", snapshot.effectOutcome, h),
                            metric(
                                "callback count",
                                String(snapshot.reportCount),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Reporter callback",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "message",
                                        snapshot.message,
                                        h,
                                        "cyan"
                                    ),
                                    metric("severity", snapshot.severity, h),
                                    metric(
                                        "attributes",
                                        snapshot.attributes,
                                        h
                                    ),
                                    metric(
                                        "reported?",
                                        String(snapshot.reportCount > 0),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.captureCase === "Manual"
                                        ? "Manual reporting observes a Cause and then returns Success<void>; it does not fail the current workflow."
                                        : "withErrorReporting observes the failure while preserving it for the surrounding Effect.",
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

const annotation_label = (
    annotationCase: ErrorReporterDemo.AnnotationCase
): string =>
    annotationCase === "Default"
        ? "default"
        : annotationCase === "Annotated"
          ? "severity + attrs"
          : "ignored"

const annotations_view = <ParentMessage>(
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ErrorReporterDemo.annotation_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Error annotations",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Default", "Annotated", "Ignored"] as const
                                ).map(
                                    (
                                        annotationCase: ErrorReporterDemo.AnnotationCase
                                    ) =>
                                        choice_button(
                                            annotation_label(annotationCase),
                                            model.annotationCase ===
                                                annotationCase,
                                            ErrorReporterDemo.Message.SelectedErrorReporterAnnotationCase(
                                                {
                                                    annotationCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("error", snapshot.name, h, "cyan"),
                            metric(
                                "isIgnored",
                                String(snapshot.ignored),
                                h,
                                snapshot.ignored ? "amber" : "green"
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Resolved reporter metadata",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("severity", snapshot.severity, h),
                                    metric(
                                        "attributes",
                                        snapshot.attributes,
                                        h
                                    ),
                                    metric(
                                        "callback count",
                                        String(snapshot.reportCount),
                                        h,
                                        snapshot.reportCount === 0
                                            ? "amber"
                                            : "green"
                                    ),
                                    metric(
                                        "callback message",
                                        snapshot.callbackMessage,
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
                                    model.annotationCase === "Ignored"
                                        ? "The error is still a real Effect failure, but ErrorReporter.make suppresses the external callback."
                                        : model.annotationCase === "Annotated"
                                          ? "The callback receives Warn plus requestId / route metadata extracted from the error object."
                                          : "A plain Error receives the default Info severity and an empty attributes record.",
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

const layers_view = <ParentMessage>(
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ErrorReporterDemo.layer_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Layer mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Replace", "Merge"] as const).map(
                                    (layerCase: ErrorReporterDemo.LayerCase) =>
                                        choice_button(
                                            layerCase,
                                            model.layerCase === layerCase,
                                            ErrorReporterDemo.Message.SelectedErrorReporterLayerCase(
                                                {
                                                    layerCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("mode", snapshot.mode, h, "cyan"),
                            metric("base reporter", snapshot.baseReporter, h),
                            metric(
                                "incoming reporter",
                                snapshot.incomingReporter,
                                h
                            ),
                            metric(
                                "reference default",
                                snapshot.defaultReference,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Active reporter set",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "expected active set",
                                snapshot.expectedSet,
                                h,
                                "cyan"
                            ),
                            metric("actual callbacks", snapshot.calls, h),
                            metric(
                                "callback count",
                                String(snapshot.callCount),
                                h,
                                "green"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.layerCase === "Merge"
                                        ? "The incoming layer reads the existing reporter reference and adds B beside A."
                                        : "The incoming layer replaces the existing set, so only B handles the failure.",
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

const dedupe_label = (dedupeCase: ErrorReporterDemo.DedupeCase): string =>
    dedupeCase === "SameCause"
        ? "same Cause"
        : dedupeCase === "SameError"
          ? "same Error"
          : dedupeCase === "DistinctErrors"
            ? "distinct Errors"
            : "interrupt"

const dedupe_view = <ParentMessage>(
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ErrorReporterDemo.dedupe_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Scenario",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "SameCause",
                                        "SameError",
                                        "DistinctErrors",
                                        "Interrupt",
                                    ] as const
                                ).map(
                                    (
                                        dedupeCase: ErrorReporterDemo.DedupeCase
                                    ) =>
                                        choice_button(
                                            dedupe_label(dedupeCase),
                                            model.dedupeCase === dedupeCase,
                                            ErrorReporterDemo.Message.SelectedErrorReporterDedupeCase(
                                                {
                                                    dedupeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("scenario", snapshot.scenario, h, "cyan"),
                            metric(
                                "report attempts",
                                String(snapshot.reportAttempts),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),

            panel(
                "Reporter filtering",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "callbacks",
                                        String(snapshot.callbacks),
                                        h,
                                        snapshot.callbacks <= 1
                                            ? "green"
                                            : "cyan"
                                    ),
                                    metric("messages", snapshot.messages, h),
                                ]
                            ),
                            metric("why", snapshot.reason, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: ErrorReporterDemo.StageDetails,
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
    model: ErrorReporterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ErrorReporterDemo.stage_details[model.stage]

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
                                        ["effect / ErrorReporter"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Forward failures without changing control flow",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Capture reported causes, resolve error annotations, install reporter sets with Layers, and see the identity-based deduplication built into ErrorReporter.make.",
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
                                        ["17 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Cause → callback"]
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

            model.stage === "Capture"
                ? capture_view(model, to_parent_message, h)
                : model.stage === "Annotations"
                  ? annotations_view(model, to_parent_message, h)
                  : model.stage === "Layers"
                    ? layers_view(model, to_parent_message, h)
                    : dedupe_view(model, to_parent_message, h),

            notice_panel(details, h),
        ]
    )
}
