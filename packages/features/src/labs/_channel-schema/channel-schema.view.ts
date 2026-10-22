import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./channel-schema.ts"

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
                Demo.Message.SelectedChannelSchemaStage({ stage }),
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

const chunkColumn = <ParentMessage>(
    label: string,
    type: string,
    chunks: ReadonlyArray<ReadonlyArray<unknown>>,
    tone: "cyan" | "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-3")],
        [
            card(label, type, tone, h),
            chunks.length === 0
                ? card("chunks", "no emitted chunk", "amber", h)
                : h.div(
                      [h.Class("space-y-2")],
                      chunks.map((chunk, index) =>
                          card(
                              `chunk ${index + 1}`,
                              JSON.stringify(chunk),
                              tone,
                              h
                          )
                      )
                  ),
        ]
    )

const decodeView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.decodeResult(model.decodeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · decode encoded chunks before app code sees them",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Typed", "Unknown", "Invalid"] as const).map(
                            (decodeMode) =>
                                action(
                                    decodeMode,
                                    Demo.Message.SelectedChannelSchemaDecodeMode(
                                        {
                                            decodeMode,
                                        }
                                    ),
                                    toParent,
                                    model.decodeMode === decodeMode,
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
                            chunkColumn(
                                "encoded input",
                                x.inputType,
                                x.input,
                                model.decodeMode === "Invalid"
                                    ? "amber"
                                    : "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["ChannelSchema.decode →"]
                            ),
                            chunkColumn(
                                "typed output",
                                x.outputType,
                                x.output,
                                x.output.length === 0 ? "amber" : "green",
                                h
                            ),
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
                            card("Channel OutErr", x.error, "amber", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Chunk validation is all-or-error",
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

const encodeView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.encodeResult(model.encodeMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · encode typed app chunks for the wire boundary",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Typed", "Unknown"] as const).map((encodeMode) =>
                            action(
                                encodeMode,
                                Demo.Message.SelectedChannelSchemaEncodeMode({
                                    encodeMode,
                                }),
                                toParent,
                                model.encodeMode === encodeMode,
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
                            chunkColumn(
                                "typed input",
                                x.inputType,
                                x.input,
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["ChannelSchema.encode →"]
                            ),
                            chunkColumn(
                                "encoded output",
                                x.outputType,
                                x.output,
                                "green",
                                h
                            ),
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
                "Unknown is a static boundary choice",
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

const duplexView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const facts = Demo.duplexFacts()

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · wrap an encoded bidirectional Channel in typed schemas",
                [
                    h.div(
                        [h.Class("grid gap-2 p-5 lg:grid-cols-5")],
                        facts.map(([label, value], index) =>
                            card(
                                label,
                                value,
                                index === 0 || index === 4
                                    ? "green"
                                    : index === 2
                                      ? "amber"
                                      : "violet",
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            panel(
                "duplex is encode → inner Channel → decode",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const encodedEcho =
  Channel.identity<
    NonEmptyReadonlyArray<string>,
    Schema.SchemaError,
    void
  >()

const typedEcho =
  ChannelSchema.duplex(
    encodedEcho,
    {
      inputSchema:
        Schema.NumberFromString,

      outputSchema:
        Schema.NumberFromString
    }
  )

// caller:
// number[] → number[]

// inner channel:
// string[] → string[]`,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why duplex exists",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Use duplex when a transport/protocol Channel already speaks encoded chunks internally but you want callers to work entirely with Schema Type values. `duplexUnknown` is the same idea when the wrapped encoded side is intentionally erased to unknown.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const boundaryView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const x = Demo.boundaryResult(model.boundaryMode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · boundary details",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            ["Types", "Errors", "Options", "Services"] as const
                        ).map((boundaryMode) =>
                            action(
                                boundaryMode,
                                Demo.Message.SelectedChannelSchemaBoundaryMode({
                                    boundaryMode,
                                }),
                                toParent,
                                model.boundaryMode === boundaryMode,
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
                        [card(x.title, x.lines.join("\n"), "cyan", h)]
                    ),
                ],
                h
            ),
            panel(
                "Schema stays visible in the Channel type",
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
            model.stage === "Decode"
                ? decodeView(model, toParent, h)
                : model.stage === "Encode"
                  ? encodeView(model, toParent, h)
                  : model.stage === "Duplex"
                    ? duplexView(h)
                    : boundaryView(model, toParent, h),
        ]
    )
