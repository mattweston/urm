import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./port.ts"

type ToParentMessage<ParentMessage> = (
    message: Demo.DemoMessage
) => ParentMessage

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
    message: Demo.DemoMessage,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Port examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.DemoMessage.SelectedPortStage({
                            stage,
                        })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
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

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const result_card = <ParentMessage>(
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
            h.div(
                [h.Class("mt-2 break-words font-mono text-sm font-semibold")],
                [value]
            ),
        ]
    )
}

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    empty: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              [empty]
          )
        : h.div(
              [],
              entries.map((entry, index) =>
                  h.div(
                      [
                          h.Class(
                              "grid grid-cols-[2.5rem_1fr] gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
                          ),
                      ],
                      [
                          h.span(
                              [
                                  h.Class(
                                      "font-mono text-xs text-muted-foreground"
                                  ),
                              ],
                              [String(index + 1).padStart(2, "0")]
                          ),
                          h.span([h.Class("font-mono text-xs")], [entry]),
                      ]
                  )
              )
          )

const inbound_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const status = Demo.inboundStatus(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · host → inbound Port → Subscription → Message",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr]")],
                        [
                            result_card(
                                "host handle",
                                `ports.stepChanged.send({ step: ${model.inboundStep} })`,
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Schema decode →"]
                            ),
                            result_card(
                                "app stream",
                                status.stream,
                                model.inboundAttached ? "green" : "amber",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        ([1, 5, 10] as const).map((step) =>
                            action(
                                `step ${step}`,
                                Demo.DemoMessage.SelectedInboundValue({
                                    step,
                                }),
                                to_parent_message,
                                model.inboundStep === step,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "startup rule",
                                status.preAttach,
                                "violet",
                                h
                            ),
                            result_card(
                                "backlog",
                                JSON.stringify(model.inboundBacklog),
                                model.inboundBacklog.length > 0
                                    ? "amber"
                                    : "cyan",
                                h
                            ),
                            result_card(
                                "delivered",
                                JSON.stringify(model.inboundDelivered),
                                model.inboundDelivered.length > 0
                                    ? "green"
                                    : "cyan",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Host send",
                                Demo.DemoMessage.ClickedHostSendInbound(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Attach Port.stream",
                                Demo.DemoMessage.ClickedAttachInbound(),
                                to_parent_message,
                                model.inboundAttached,
                                h
                            ),
                            action(
                                "Detach stream",
                                Demo.DemoMessage.ClickedDetachInbound(),
                                to_parent_message,
                                !model.inboundAttached,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.DemoMessage.ClickedResetInbound(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "First-attach buffering is special",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Inbound sends made immediately after Runtime.embed are buffered until the app's first Port.stream attaches, so startup sends are not lost. After that first attach, if no stream is currently attached, new inbound values are dropped — matching gated Subscription semantics.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Common form: Port.subscription",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const subscriptions =
  Subscription.make<Model, Message>()(
    _entry => ({
      hostStep:
        Port.subscription(
          ports.inbound.stepChanged,
          ({ step }) =>
            Message.ChangedStepFromHost({
              step
            })
        )
    })
  )`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const outbound_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const status = Demo.outboundStatus(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · app Command → Port.emit → host listeners",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr]")],
                        [
                            result_card(
                                "app",
                                `ReportCount({ count: ${model.outboundCount + 1} })`,
                                "violet",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Port.emit → encode →"]
                            ),
                            result_card(
                                "host",
                                status.listeners,
                                model.outboundListenerCount > 0
                                    ? "green"
                                    : "amber",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            stat(
                                "next count",
                                String(model.outboundCount + 1),
                                h
                            ),
                            stat("delivery", status.delivery, h),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Emit countChanged",
                                Demo.DemoMessage.ClickedEmitOutbound(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "+ listener",
                                Demo.DemoMessage.ClickedAddOutboundListener(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "− listener",
                                Demo.DemoMessage.ClickedRemoveOutboundListener(),
                                to_parent_message,
                                model.outboundListenerCount === 0,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.DemoMessage.ClickedResetOutbound(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Emission log",
                [log_view(model.outboundLog, "No outbound emissions yet.", h)],
                h
            ),
            panel(
                "Outbound work stays in Commands",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const ReportCount =
  Command.define(
    "ReportCount",
    {
      args: {
        count: Schema.Number,
        source: CountEvent.fields.source
      },

      messages: [
        Message.CompletedReportCount
      ],

      execute:
        ({ count, source }) =>
          Port.emit(
            ports.outbound.countChanged,
            { count, source }
          ).pipe(
            Effect.as(
              Message.CompletedReportCount()
            )
          )
    }
  )`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Port.emit is an Effect. That keeps host notification outside update and makes it compose like any other Command work. If the program is started with Runtime.run instead of embed, configured outbound emits are simply no-ops because there is no host connector listening.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const stat = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("bg-card p-4 text-center")],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [h.Class("mt-2 font-mono text-xs font-bold text-cyan-500")],
                [value]
            ),
        ]
    )

const schema_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · every crossing goes through the Port Schema",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr]")],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Host tries to send step"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.schemaInput),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                Demo.DemoMessage.UpdatedSchemaInput(
                                                    {
                                                        value,
                                                    }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-2")],
                                Demo.schemaFacts(model).map(([label, value]) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "grid gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 sm:grid-cols-[8rem_1fr]"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "font-mono text-[10px] text-muted-foreground"
                                                    ),
                                                ],
                                                [label]
                                            ),
                                            h.span(
                                                [h.Class("font-mono text-xs")],
                                                [value]
                                            ),
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Validate send",
                                Demo.DemoMessage.ClickedValidateInbound(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Encoded host side; decoded app side",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Inbound handle.send validates by decoding against the Port Schema. Invalid input returns an Exit carrying SchemaError, logs the rejection, and never reaches the app. Outbound Port.emit performs the opposite conversion: app Value → Schema encode → host Encoded value.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Ports carry boundary facts, not the Model",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Keep Port schemas network-payload-like: serializable data with an explicit Schema. Functions, DOM references, and the application's Model should not cross. Outbound Ports announce facts the host cares about rather than exposing internal state snapshots.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const embed_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Runtime.embed exposes the host handles",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
                            ),
                        ],
                        Demo.embedFacts(model).map(([label, value]) =>
                            result_card(
                                label,
                                value,
                                label === "lifetime"
                                    ? model.embedDisposed
                                        ? "amber"
                                        : "green"
                                    : "cyan",
                                h
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Host send",
                                Demo.DemoMessage.ClickedEmbedSend(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Host subscribe",
                                Demo.DemoMessage.ClickedEmbedSubscribe(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                model.embedDisposed
                                    ? "Disposed"
                                    : "handle.dispose()",
                                Demo.DemoMessage.ClickedEmbedDispose(),
                                to_parent_message,
                                model.embedDisposed,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.DemoMessage.ClickedResetEmbed(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Host log",
                [log_view(model.embedLog, "No host actions yet.", h)],
                h
            ),
            panel(
                "Host wiring",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [Demo.hostSketch]
                    ),
                ],
                h
            ),
            panel(
                "Dispose owns the whole embedded lifetime",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "EmbedHandle.dispose is idempotent. It interrupts the runtime and cleans up Subscriptions, ManagedResources, Mounts, listeners, and in-flight Commands, removes the Foldkit DOM, and leaves the container ready for a fresh embed. Inbound sends after disposal are no-ops; outbound subscriptions become inert.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Inbound"
                ? inbound_view(model, to_parent_message, h)
                : model.stage === "Outbound"
                  ? outbound_view(model, to_parent_message, h)
                  : model.stage === "Schema"
                    ? schema_view(model, to_parent_message, h)
                    : embed_view(model, to_parent_message, h),
        ]
    )
