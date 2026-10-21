import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./cause.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

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
    message: Demo.Message,
    toParent: ToParentMessage<ParentMessage>,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParent(message),
            isDisabled: active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const tabs = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
        ],
        Demo.stages.map((stage) =>
            action(
                stage,
                Demo.Message.SelectedCauseStage({
                    stage,
                }),
                toParent,
                model.stage === stage,
                h
            )
        )
    )

const resultCard = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : tone === "violet"
                ? "border-violet-500/40 bg-violet-500/5 text-violet-500"
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
            h.pre(
                [
                    h.Class(
                        "mt-2 overflow-auto whitespace-pre-wrap font-mono text-sm font-semibold"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const reasonCards = <ParentMessage>(
    reasons: ReadonlyArray<
        Readonly<{
            tag: string
            payload: string
        }>
    >,
    h: HtmlBuilder<ParentMessage>
): Html =>
    reasons.length === 0
        ? resultCard("reasons", "[]", "cyan", h)
        : h.div(
              [h.Class("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")],
              reasons.map((reason) => {
                  const tone =
                      reason.tag === "Fail"
                          ? "cyan"
                          : reason.tag === "Die"
                            ? "amber"
                            : "violet"

                  return resultCard(reason.tag, reason.payload, tone, h)
              })
          )

const reasonsView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.reasonResult(model.reasonMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · Cause is a collection of Reasons",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Fail", "Die", "Interrupt", "Empty"] as const).map(
                            (reasonMode) =>
                                action(
                                    reasonMode,
                                    Demo.Message.SelectedCauseReasonMode({
                                        reasonMode,
                                    }),
                                    toParent,
                                    model.reasonMode === reasonMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            resultCard("expression", x.expression, "green", h),
                            h.div(
                                [h.Class("mt-4")],
                                [reasonCards(x.reasons, h)]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Three failure kinds",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const combineView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.combineResult(model.combineMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · combine independent failures without flattening them away",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["TwoFails", "Mixed", "Dedupe", "Map"] as const).map(
                            (combineMode) =>
                                action(
                                    combineMode,
                                    Demo.Message.SelectedCauseCombineMode({
                                        combineMode,
                                    }),
                                    toParent,
                                    model.combineMode === combineMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            resultCard("expression", x.expression, "green", h),
                            h.div(
                                [h.Class("mt-4")],
                                [reasonCards(x.reasons, h)]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Flat reason model in Effect 4",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const inspectView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.inspectResult(model.inspectMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · inspect without destroying structure",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Kinds",
                                "FindError",
                                "FindDefect",
                                "Interruptors",
                                "InterruptOnly",
                            ] as const
                        ).map((inspectMode) =>
                            action(
                                inspectMode,
                                Demo.Message.SelectedCauseInspectMode({
                                    inspectMode,
                                }),
                                toParent,
                                model.inspectMode === inspectMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            resultCard("expression", x.expression, "violet", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            resultCard("output", x.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Choose the extractor that preserves what you need",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

const renderView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.renderResult(model.renderMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · render everything or squash to one throwable value",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "SquashFail",
                                "SquashDefect",
                                "InterruptOnly",
                                "PrettyErrors",
                                "Pretty",
                            ] as const
                        ).map((renderMode) =>
                            action(
                                renderMode,
                                Demo.Message.SelectedCauseRenderMode({
                                    renderMode,
                                }),
                                toParent,
                                model.renderMode === renderMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-start"
                            ),
                        ],
                        [
                            resultCard("expression", x.expression, "violet", h),
                            h.div(
                                [
                                    h.Class(
                                        "pt-5 text-center text-muted-foreground"
                                    ),
                                ],
                                ["→"]
                            ),
                            resultCard("output", x.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Squash is intentionally lossy",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            tabs(model, toParent, h),
            model.stage === "Reasons"
                ? reasonsView(model, toParent, h)
                : model.stage === "Combine"
                  ? combineView(model, toParent, h)
                  : model.stage === "Inspect"
                    ? inspectView(model, toParent, h)
                    : renderView(model, toParent, h),
        ]
    )
