import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./config-provider.ts"

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
                Demo.Message.SelectedConfigProviderStage({ stage }),
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

const sourcesView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.sourceResult(model.sourceMode)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · provider sources expose a raw Node tree",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Unknown", "Env", "DotEnv", "Empty"] as const).map(
                            (sourceMode) =>
                                action(
                                    sourceMode,
                                    Demo.Message.SelectedConfigProviderSourceMode(
                                        { sourceMode }
                                    ),
                                    toParent,
                                    model.sourceMode === sourceMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            card("constructor", x.constructor, "violet", h),
                            card("raw source", x.raw, "cyan", h),
                            card("lookup path", x.path, "cyan", h),
                            card(
                                "raw node",
                                x.node,
                                x.node.includes("undefined")
                                    ? "amber"
                                    : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "ConfigProvider does not validate domain values",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [x.detail]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "Provider output is raw Node data. Config applies Schema decoding, defaults, Option semantics, and typed ConfigError above it.",
                        ]
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
                "2 · provider fallback happens on raw lookup absence",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Fallback",
                                "Reverse",
                                "Missing",
                                "SourceError",
                            ] as const
                        ).map((composeMode) =>
                            action(
                                composeMode,
                                Demo.Message.SelectedConfigProviderComposeMode({
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
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            card("expression", x.expression, "violet", h),
                            h.div(
                                [h.Class("mt-4 grid gap-3 md:grid-cols-2")],
                                [
                                    card(
                                        "HOST / result",
                                        x.host,
                                        model.composeMode === "SourceError"
                                            ? "amber"
                                            : "green",
                                        h
                                    ),
                                    card("PORT / meaning", x.port, "cyan", h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "undefined and SourceError mean different things",
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

const pathsView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.pathResult(model.pathMode)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · rewrite lookup paths before they hit the source",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "ConstantCase",
                                "Nested",
                                "MapInput",
                                "Order",
                            ] as const
                        ).map((pathMode) =>
                            action(
                                pathMode,
                                Demo.Message.SelectedConfigProviderPathMode({
                                    pathMode,
                                }),
                                toParent,
                                model.pathMode === pathMode,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-4"
                            ),
                        ],
                        [
                            card("caller path", x.input, "cyan", h),
                            card("transform", x.transform, "violet", h),
                            card("backing lookup", x.backing, "amber", h),
                            card("node value", x.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Transform order is observable",
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

const layerView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.layerResult(model.layerMode)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · install, extend, or implement a provider",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Replace",
                                "AddFallback",
                                "AddPrimary",
                                "Custom",
                                "Directory",
                            ] as const
                        ).map((layerMode) =>
                            action(
                                layerMode,
                                Demo.Message.SelectedConfigProviderLayerMode({
                                    layerMode,
                                }),
                                toParent,
                                model.layerMode === layerMode,
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
                            card("expression", x.expression, "violet", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            card(
                                "result",
                                x.result,
                                model.layerMode === "Directory"
                                    ? "amber"
                                    : "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Provider is an application-level capability",
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
            panel(
                model.layerMode === "Directory"
                    ? "Directory provider sketch"
                    : "Layer composition sketch",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            model.layerMode === "Directory"
                                ? Demo.directorySketch
                                : Demo.layerSketch,
                        ]
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
            model.stage === "Sources"
                ? sourcesView(model, toParent, h)
                : model.stage === "Compose"
                  ? composeView(model, toParent, h)
                  : model.stage === "Paths"
                    ? pathsView(model, toParent, h)
                    : layerView(model, toParent, h),
        ]
    )
