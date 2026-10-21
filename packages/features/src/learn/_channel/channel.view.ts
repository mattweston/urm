import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./channel.ts"

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
                Demo.Message.SelectedChannelStage({ stage }),
                toParent,
                model.stage === stage,
                h
            )
        )
    )

const card = <ParentMessage>(
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
                        "mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const elementRow = <ParentMessage>(
    values: ReadonlyArray<string>,
    tone: "cyan" | "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex min-h-16 flex-wrap items-center gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
            ),
        ],
        values.length === 0
            ? [
                  h.span(
                      [
                          h.Class(
                              "w-full text-center font-mono text-xs text-muted-foreground"
                          ),
                      ],
                      ["no emitted elements"]
                  ),
              ]
            : values.map((value) =>
                  h.span(
                      [
                          h.Class(
                              tone === "green"
                                  ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-mono text-xs text-emerald-600"
                                  : tone === "amber"
                                    ? "rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 px-3 py-2 font-mono text-xs text-amber-600"
                                    : "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 font-mono text-xs text-cyan-500"
                          ),
                      ],
                      [value]
                  )
              )
    )

const sourceView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.sourceResult(model.sourceMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · source channels have elements, error, and done",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Array", "Succeed", "Done", "Fail"] as const).map(
                            (sourceMode) =>
                                action(
                                    sourceMode,
                                    Demo.Message.SelectedChannelSourceMode({
                                        sourceMode,
                                    }),
                                    toParent,
                                    model.sourceMode === sourceMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "space-y-4 border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            card("expression", x.expression, "violet", h),
                            elementRow(x.emitted, "cyan", h),
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    card("OutDone", x.done, "green", h),
                                    card(
                                        "OutErr",
                                        x.error,
                                        x.error === "never" ? "cyan" : "amber",
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
                "Channel is richer than Iterable",
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

const transformView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.transformResult(model.transformMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · transform output elements",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Map",
                                "Filter",
                                "MapEffect",
                                "Concurrent",
                            ] as const
                        ).map((transformMode) =>
                            action(
                                transformMode,
                                Demo.Message.SelectedChannelTransformMode({
                                    transformMode,
                                }),
                                toParent,
                                model.transformMode === transformMode,
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
                            elementRow(x.input.map(String), "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["→"]
                            ),
                            elementRow(x.output.map(String), "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-2"
                            ),
                        ],
                        [
                            card("expression", x.expression, "violet", h),
                            card("execution", x.execution, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Effectful mapping changes the Channel type",
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

const composeView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.composeResult(model.composeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · compose whole channels",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            ["Concat", "FlatMap", "PipeTo", "MapDone"] as const
                        ).map((composeMode) =>
                            action(
                                composeMode,
                                Demo.Message.SelectedChannelComposeMode({
                                    composeMode,
                                }),
                                toParent,
                                model.composeMode === composeMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            elementRow(x.left, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [model.composeMode === "PipeTo" ? "pipe" : "+"]
                            ),
                            elementRow(x.right, "amber", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            elementRow(x.output, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [card("expression", x.expression, "violet", h)]
                    ),
                ],
                h
            ),
            panel(
                "pipeTo connects two protocols",
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

const runView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.runResult(model.runMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · run Channel back into Effect",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Collect",
                                "Fold",
                                "Head",
                                "Last",
                                "Recover",
                            ] as const
                        ).map((runMode) =>
                            action(
                                runMode,
                                Demo.Message.SelectedChannelRunMode({
                                    runMode,
                                }),
                                toParent,
                                model.runMode === runMode,
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
                            card("Channel runner", x.expression, "violet", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            card("Effect result", x.result, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Channel stays lazy until run",
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
            model.stage === "Source"
                ? sourceView(model, toParent, h)
                : model.stage === "Transform"
                  ? transformView(model, toParent, h)
                  : model.stage === "Compose"
                    ? composeView(model, toParent, h)
                    : runView(model, toParent, h),
        ]
    )
