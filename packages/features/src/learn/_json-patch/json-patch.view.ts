import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as JsonPatchDemo from "./json-patch.ts"

type ToParentMessage<ParentMessage> = (
    message: JsonPatchDemo.Message
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
    message: JsonPatchDemo.Message,
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
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect JsonPatch examples"),
        ],
        JsonPatchDemo.stages.map((stage: JsonPatchDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        JsonPatchDemo.Message.SelectedJsonPatchStage({ stage })
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
    details: JsonPatchDemo.StageDetails,
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

const diff_label = (diffCase: JsonPatchDemo.DiffCase): string =>
    diffCase.toLowerCase()

const diff_view = <ParentMessage>(
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPatchDemo.diff_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Diff input",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Nested", "Identical", "Root"] as const).map(
                                    (diffCase: JsonPatchDemo.DiffCase) =>
                                        choice_button(
                                            diff_label(diffCase),
                                            model.diffCase === diffCase,
                                            JsonPatchDemo.Message.SelectedJsonPatchDiffCase(
                                                {
                                                    diffCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("before", snapshot.before, h),
                            metric("after", snapshot.after, h, "cyan"),
                            metric(
                                "operation count",
                                String(snapshot.operationCount),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Generated patch",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "ordered operations",
                                snapshot.patch,
                                h,
                                "cyan"
                            ),
                            metric(
                                "operation kinds",
                                snapshot.operationKinds,
                                h
                            ),
                            metric(
                                "apply(get(before, after), before)",
                                snapshot.roundTrip,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const apply_label = (applyCase: JsonPatchDemo.ApplyCase): string =>
    applyCase.toLowerCase()

const apply_view = <ParentMessage>(
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPatchDemo.apply_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Replay mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Manual", "Generated", "Empty"] as const).map(
                                    (applyCase: JsonPatchDemo.ApplyCase) =>
                                        choice_button(
                                            apply_label(applyCase),
                                            model.applyCase === applyCase,
                                            JsonPatchDemo.Message.SelectedJsonPatchApplyCase(
                                                {
                                                    applyCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("before", snapshot.before, h),
                            metric("patch", snapshot.patch, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Immutable result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("result", snapshot.result, h, "green"),
                            metric(
                                "original after apply",
                                snapshot.originalAfter,
                                h
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "input unchanged",
                                        String(snapshot.inputUnchanged),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "same reference",
                                        String(snapshot.sameReference),
                                        h,
                                        model.applyCase === "Empty"
                                            ? "green"
                                            : "amber"
                                    ),
                                ]
                            ),
                            metric(
                                "root replace",
                                snapshot.rootReplace,
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

const array_label = (arrayCase: JsonPatchDemo.ArrayCase): string =>
    arrayCase === "ReplaceRemove" ? "replace + remove" : arrayCase.toLowerCase()

const arrays_view = <ParentMessage>(
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPatchDemo.array_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Array case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["ReplaceRemove", "Grow", "Append"] as const
                                ).map((arrayCase: JsonPatchDemo.ArrayCase) =>
                                    choice_button(
                                        array_label(arrayCase),
                                        model.arrayCase === arrayCase,
                                        JsonPatchDemo.Message.SelectedJsonPatchArrayCase(
                                            {
                                                arrayCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("before", snapshot.before, h),
                            metric("after", snapshot.after, h, "cyan"),
                            metric(
                                "operation count",
                                String(snapshot.operationCount),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Index semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("patch", snapshot.patch, h, "cyan"),
                            metric(
                                "ordering rule",
                                snapshot.ordering,
                                h,
                                "amber"
                            ),
                            metric("applied", snapshot.applied, h, "green"),
                            metric("append result", snapshot.appendResult, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const pointer_label = (pointerCase: JsonPatchDemo.PointerCase): string =>
    pointerCase.toLowerCase()

const pointers_view = <ParentMessage>(
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPatchDemo.pointer_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Pointer behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Escaping",
                                        "Sequential",
                                        "Errors",
                                    ] as const
                                ).map(
                                    (pointerCase: JsonPatchDemo.PointerCase) =>
                                        choice_button(
                                            pointer_label(pointerCase),
                                            model.pointerCase === pointerCase,
                                            JsonPatchDemo.Message.SelectedJsonPatchPointerCase(
                                                {
                                                    pointerCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "generated paths",
                                snapshot.generatedPaths,
                                h,
                                "cyan"
                            ),
                            metric(
                                'root path ""',
                                snapshot.rootPath,
                                h,
                                "green"
                            ),
                            metric(
                                "invalid replace",
                                snapshot.error,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Sequential operations",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("patch", snapshot.patch, h, "cyan"),
                            metric(
                                "selected result",
                                snapshot.result,
                                h,
                                "green"
                            ),
                            metric("add then replace", snapshot.sequential, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Generated object paths use RFC 6901 escaping: '/' becomes '~1' and '~' becomes '~0'. Later operations observe the document produced by earlier operations.",
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
    details: JsonPatchDemo.StageDetails,
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
    model: JsonPatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = JsonPatchDemo.stage_details[model.stage]

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
                                        ["effect / JsonPatch"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Deterministic JSON diffs and immutable replay",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compute ordered add / remove / replace operations from two JSON documents, replay them immutably, and inspect array-index and JSON Pointer edge cases.",
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
                                        ["4 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["add · remove · replace"]
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
            model.stage === "Diff"
                ? diff_view(model, to_parent_message, h)
                : model.stage === "Apply"
                  ? apply_view(model, to_parent_message, h)
                  : model.stage === "Arrays"
                    ? arrays_view(model, to_parent_message, h)
                    : pointers_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
