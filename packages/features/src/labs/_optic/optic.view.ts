import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as OpticDemo from "./optic.ts"

type ToParentMessage<ParentMessage> = (
    message: OpticDemo.Message
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
    message: OpticDemo.Message,
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
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Optic examples"),
        ],
        OpticDemo.stages.map((stage: OpticDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        OpticDemo.Message.SelectedOpticStage({ stage })
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
    details: OpticDemo.StageDetails,
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

const kinds_view = <ParentMessage>(
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OpticDemo.kinds_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Optic kinds",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Models",
                                        "Compose",
                                        "Constructors",
                                    ] as const
                                ).map((kindsCase: OpticDemo.KindsCase) =>
                                    choice_button(
                                        kindsCase.toLowerCase(),
                                        model.kindsCase === kindsCase,
                                        OpticDemo.Message.SelectedOpticKindsCase(
                                            {
                                                kindsCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("Iso", snapshot.iso, h, "cyan"),
                            metric("Lens", snapshot.lens, h, "green"),
                            metric("Prism", snapshot.prism, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Guarantees + composition",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Optional", snapshot.optional, h),
                            metric("Traversal", snapshot.traversal, h, "cyan"),
                            metric(
                                "composition",
                                snapshot.composition,
                                h,
                                "green"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Iso round trip",
                                        snapshot.isoRoundTrip,
                                        h
                                    ),
                                    metric(
                                        "Lens replace",
                                        snapshot.lensExample,
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

const focus_label = (value: OpticDemo.FocusCase): string =>
    value === "OptionalKey" ? "optional key" : value.toLowerCase()

const focus_view = <ParentMessage>(
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OpticDemo.focus_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Focus path",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Key", "OptionalKey", "Narrow"] as const).map(
                                    (focusCase: OpticDemo.FocusCase) =>
                                        choice_button(
                                            focus_label(focusCase),
                                            model.focusCase === focusCase,
                                            OpticDemo.Message.SelectedOpticFocusCase(
                                                {
                                                    focusCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("name focus", snapshot.name, h, "cyan"),
                            metric(
                                "renamed copy",
                                snapshot.renamed,
                                h,
                                "green"
                            ),
                            metric(
                                "source unchanged",
                                String(snapshot.sourceUnchanged),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Conditional focus",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "optionalKey(undefined)",
                                snapshot.nicknameRemoved,
                                h,
                                "amber"
                            ),
                            metric("at(PORT)", snapshot.atHit, h, "cyan"),
                            metric(
                                "tag(Circle).key(radius)",
                                snapshot.circleHit,
                                h,
                                "green"
                            ),
                            metric(
                                "Rect fails Circle prism",
                                String(snapshot.rectangleFails),
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const failure_view = <ParentMessage>(
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OpticDemo.failure_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Read / replace",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Read", "Replace", "Builtins"] as const).map(
                                    (failureCase: OpticDemo.FailureCase) =>
                                        choice_button(
                                            failureCase.toLowerCase(),
                                            model.failureCase === failureCase,
                                            OpticDemo.Message.SelectedOpticFailureCase(
                                                {
                                                    failureCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("get Lens", snapshot.get, h, "green"),
                            metric(
                                "getResult hit",
                                snapshot.getResultHit,
                                h,
                                "cyan"
                            ),
                            metric(
                                "getResult miss",
                                snapshot.getResultMiss,
                                h,
                                "amber"
                            ),
                            metric(
                                "replace hit",
                                String(snapshot.replaceHit),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Graceful failure + built-ins",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "replace miss returns source",
                                String(snapshot.replaceMissUnchanged),
                                h,
                                "green"
                            ),
                            metric(
                                "set through some()",
                                snapshot.prismSet,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("some() hit", snapshot.someHit, h),
                                    metric(
                                        "none() on Some",
                                        String(snapshot.noneMiss),
                                        h,
                                        "amber"
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "success() hit",
                                        snapshot.successHit,
                                        h
                                    ),
                                    metric(
                                        "failure() on Success",
                                        String(snapshot.failureMiss),
                                        h,
                                        "amber"
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

const traverse_view = <ParentMessage>(
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = OpticDemo.traverse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Traversal",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Collect", "ModifyAll", "Entries"] as const
                                ).map((traverseCase: OpticDemo.TraverseCase) =>
                                    choice_button(
                                        traverseCase === "ModifyAll"
                                            ? "modify all"
                                            : traverseCase.toLowerCase(),
                                        model.traverseCase === traverseCase,
                                        OpticDemo.Message.SelectedOpticTraverseCase(
                                            {
                                                traverseCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("source", snapshot.source, h),
                            metric(
                                "getAll positives",
                                snapshot.positives,
                                h,
                                "green"
                            ),
                            metric(
                                "modifyAll ×10",
                                snapshot.modified,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Preservation + record entries",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "original unchanged",
                                snapshot.originalUnchanged,
                                h
                            ),
                            metric(
                                "positive record values",
                                snapshot.recordPositiveValues,
                                h,
                                "green"
                            ),
                            metric(
                                "failed traversal getAll",
                                snapshot.failedGetAll,
                                h,
                                "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "forEach can narrow each element with another optic. Only matched elements are collected or modified; the surrounding structure and non-matching values are preserved.",
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
    details: OpticDemo.StageDetails,
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
    model: OpticDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = OpticDemo.stage_details[model.stage]

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
                                        ["effect / Optic"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Pure focused reads and immutable structural updates",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Model total, conditional, reversible, and multi-value focus; compose through nested immutable data; preserve structured failures; and use standalone dual helpers at call sites.",
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
                                        ["24 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["pure immutable updates"]
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
            model.stage === "Kinds"
                ? kinds_view(model, to_parent_message, h)
                : model.stage === "Focus"
                  ? focus_view(model, to_parent_message, h)
                  : model.stage === "Failure"
                    ? failure_view(model, to_parent_message, h)
                    : traverse_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
