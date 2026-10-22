import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./config.ts"

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
                Demo.Message.SelectedConfigStage({
                    stage,
                }),
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

const describeView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.describeResult(model.describeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · describe typed configuration",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Primitive", "Specialized", "Schema"] as const).map(
                            (describeMode) =>
                                action(
                                    describeMode,
                                    Demo.Message.SelectedConfigDescribeMode({
                                        describeMode,
                                    }),
                                    toParent,
                                    model.describeMode === describeMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            card("provider input", x.input, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Config recipe →"]
                            ),
                            card("typed value", x.output, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [card("descriptor", x.expression, "violet", h)]
                    ),
                ],
                h
            ),
            panel(
                "Config is Schema-backed",
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
                "2 · compose, nest, default, and recover",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "All",
                                "Nested",
                                "Default",
                                "Option",
                                "OrElse",
                            ] as const
                        ).map((composeMode) =>
                            action(
                                composeMode,
                                Demo.Message.SelectedConfigComposeMode({
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
                                [h.Class("mt-4 grid gap-3 md:grid-cols-3")],
                                [
                                    card("present", x.present, "green", h),
                                    card("absent", x.absent, "cyan", h),
                                    card("invalid", x.invalid, "amber", h),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                model.composeMode === "OrElse"
                    ? "orElse is broad recovery"
                    : "Absence is not the same as invalid input",
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

const collectionsView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.collectionResult(model.collectionMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · one typed collection config, two provider shapes",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Array", "Separator", "Record"] as const).map(
                            (collectionMode) =>
                                action(
                                    collectionMode,
                                    Demo.Message.SelectedConfigCollectionMode({
                                        collectionMode,
                                    }),
                                    toParent,
                                    model.collectionMode === collectionMode,
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
                            card("flat/env style", x.flat, "cyan", h),
                            card("structural style", x.structural, "violet", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            card("Config", x.expression, "violet", h),
                            h.div(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            card("typed result", x.output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Provider format stays outside the domain type",
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

const providerView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.providerResult(model.providerMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · provider boundary and typed failures",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "FromUnknown",
                                "FromEnv",
                                "Yield",
                                "Error",
                            ] as const
                        ).map((providerMode) =>
                            action(
                                providerMode,
                                Demo.Message.SelectedConfigProviderMode({
                                    providerMode,
                                }),
                                toParent,
                                model.providerMode === providerMode,
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
                            card(
                                x.title,
                                x.lines.join("\n"),
                                model.providerMode === "Error"
                                    ? "amber"
                                    : "cyan",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Config<T> is also Effect<T, ConfigError>",
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
                "Provider wiring",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [Demo.providerSketch]
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
            model.stage === "Describe"
                ? describeView(model, toParent, h)
                : model.stage === "Compose"
                  ? composeView(model, toParent, h)
                  : model.stage === "Collections"
                    ? collectionsView(model, toParent, h)
                    : providerView(model, toParent, h),
        ]
    )
