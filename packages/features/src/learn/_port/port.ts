import { Effect, Exit, Schema as S } from "effect"
import { Command, Port, Runtime, Subscription, type Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real app Port declarations
// -----------------------------------------------------------------------------

export const HostConfig = S.Struct({
    step: S.Number,
})
export type HostConfig = typeof HostConfig.Type

export const CountSource = S.Literals(["Click", "Host"])
export type CountSource = typeof CountSource.Type

export const CountEvent = S.Struct({
    count: S.Number,
    source: CountSource,
})
export type CountEvent = typeof CountEvent.Type

export const ports = {
    inbound: {
        stepChanged: Port.inbound(HostConfig),
    },

    outbound: {
        countChanged: Port.outbound(CountEvent),
    },
}

// -----------------------------------------------------------------------------
// Embedded app Model / Message
// -----------------------------------------------------------------------------

export const Model = S.Struct({
    count: S.Number,
    step: S.Number,
    lastSource: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    ChangedStepFromHost: {
        step: S.Number,
    },

    ClickedAdvance: {},

    CompletedReportCount: {},
})
export type Message = typeof Message.Type

export const Flags = S.Struct({
    initialCount: S.Number,
})
export type Flags = typeof Flags.Type

export const init: Runtime.ElementInit<Model, Message, Flags> = (flags) => ({
    model: Model.make({
        count: flags.initialCount,
        step: 1,
        lastSource: "Init",
    }),
})

// -----------------------------------------------------------------------------
// Outbound Port in a real Command
// -----------------------------------------------------------------------------

export const ReportCount = Command.define("ReportCount", {
    args: {
        count: S.Number,
        source: CountEvent.fields.source,
    },

    messages: [Message.CompletedReportCount],

    execute: ({ count, source }) =>
        Port.emit(
            ports.outbound.countChanged,
            CountEvent.make({
                count,
                source,
            })
        ).pipe(Effect.as(Message.CompletedReportCount())),
})

// -----------------------------------------------------------------------------
// Inbound Port as a real persistent Subscription
// -----------------------------------------------------------------------------

export const subscriptions = Subscription.make<Model, Message>()((_entry) => ({
    hostStep: Port.subscription(ports.inbound.stepChanged, ({ step }) =>
        Message.ChangedStepFromHost({
            step,
        })
    ),

    // Extra app-owned activity to show that Ports are only the host
    // boundary, not the whole runtime.
}))

type UpdateReturn = Update.Return<Model, Message>

const advance = (model: Model, source: CountSource): UpdateReturn => {
    const count = model.count + model.step

    return {
        model: evo(model, {
            count: () => count,
            lastSource: () => source,
        }),

        commands: [
            ReportCount({
                count,
                source,
            }),
        ],
    }
}

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        ChangedStepFromHost: ({ step }) => ({
            model: evo(model, {
                step: () => step,
                lastSource: () => "Host",
            }),
        }),

        ClickedAdvance: () => advance(model, "Click"),

        CompletedReportCount: () => ({
            model,
        }),
    })

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("rounded-lg border p-4")],
        [
            h.div([], [`Count: ${model.count}`]),
            h.div([], [`Step: ${model.step}`]),
            h.button([h.OnClick(Message.ClickedAdvance())], ["Advance"]),
        ]
    )

// Real program factory, deliberately not embedded at module import time.
export const makeElement = (container: HTMLElement, flags: Flags) =>
    Runtime.makeElement({
        Model,
        Flags,
        flags: Effect.succeed(flags),
        init,
        update,
        view,
        subscriptions,
        ports,
        container,
    })

// -----------------------------------------------------------------------------
// Host wiring sketch
// -----------------------------------------------------------------------------

export const hostSketch = `
const program =
  makeElement(
    container,
    {
      initialCount: 10
    }
  )

const handle =
  Runtime.embed(program)

// Host → Foldkit
const sent =
  handle.ports.stepChanged.send({
    step: 5
  })

// Foldkit → Host
const unsubscribe =
  handle.ports.countChanged.subscribe(
    event => {
      console.log(
        "count changed",
        event
      )
    }
  )

// Host unmount
unsubscribe()
handle.dispose()
`

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Inbound", "Outbound", "Schema", "Embed"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Inbound",
    "Outbound",
    "Schema",
    "Embed",
]

export const InboundValue = S.Literals([1, 5, 10])
export type InboundValue = typeof InboundValue.Type

export const DemoModel = S.Struct({
    stage: Stage,

    inboundAttached: S.Boolean,
    inboundStep: InboundValue,
    inboundBacklog: S.Array(S.Number),
    inboundDelivered: S.Array(S.Number),
    inboundHasEverAttached: S.Boolean,

    outboundCount: S.Number,
    outboundListenerCount: S.Number,
    outboundLog: S.Array(S.String),

    schemaInput: S.String,
    schemaAccepted: S.Boolean,
    schemaMessage: S.String,

    embedDisposed: S.Boolean,
    embedLog: S.Array(S.String),
})
export type DemoModel = typeof DemoModel.Type

export const DemoMessage = defineMessageUnion({
    SelectedPortStage: {
        stage: Stage,
    },

    SelectedInboundValue: {
        step: InboundValue,
    },
    ClickedHostSendInbound: {},
    ClickedAttachInbound: {},
    ClickedDetachInbound: {},
    ClickedResetInbound: {},

    ClickedEmitOutbound: {},
    ClickedAddOutboundListener: {},
    ClickedRemoveOutboundListener: {},
    ClickedResetOutbound: {},

    UpdatedSchemaInput: {
        value: S.String,
    },
    ClickedValidateInbound: {},

    ClickedEmbedSend: {},
    ClickedEmbedSubscribe: {},
    ClickedEmbedDispose: {},
    ClickedResetEmbed: {},

    ClickedResetPortDemo: {},
})
export type DemoMessage = typeof DemoMessage.Type

export const demoInit: DemoModel = DemoModel.make({
    stage: "Inbound",

    inboundAttached: false,
    inboundStep: 5,
    inboundBacklog: [],
    inboundDelivered: [],
    inboundHasEverAttached: false,

    outboundCount: 12,
    outboundListenerCount: 1,
    outboundLog: [],

    schemaInput: "5",
    schemaAccepted: false,
    schemaMessage: "not validated",

    embedDisposed: false,
    embedLog: [],
})

type DemoUpdateReturn = Update.Return<DemoModel, DemoMessage>

export const demoUpdate = (model: DemoModel, message: DemoMessage) =>
    DemoMessage.match<DemoUpdateReturn>(message, {
        SelectedPortStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedInboundValue: ({ step }) => ({
            model: evo(model, {
                inboundStep: () => step,
            }),
        }),

        ClickedHostSendInbound: () => {
            if (model.inboundAttached) {
                return {
                    model: evo(model, {
                        inboundDelivered: (values) => [
                            ...values,
                            model.inboundStep,
                        ],
                    }),
                }
            }

            if (!model.inboundHasEverAttached) {
                return {
                    model: evo(model, {
                        inboundBacklog: (values) => [
                            ...values,
                            model.inboundStep,
                        ],
                    }),
                }
            }

            // After first attachment, sends while no Stream is attached
            // are dropped to match gated Subscription semantics.
            return {
                model,
            }
        },

        ClickedAttachInbound: () => ({
            model: evo(model, {
                inboundAttached: () => true,
                inboundHasEverAttached: () => true,
                inboundDelivered: (delivered) => [
                    ...delivered,
                    ...model.inboundBacklog,
                ],
                inboundBacklog: () => [],
            }),
        }),

        ClickedDetachInbound: () => ({
            model: evo(model, {
                inboundAttached: () => false,
            }),
        }),

        ClickedResetInbound: () => ({
            model: evo(model, {
                inboundAttached: () => false,
                inboundBacklog: () => [],
                inboundDelivered: () => [],
                inboundHasEverAttached: () => false,
            }),
        }),

        ClickedEmitOutbound: () => {
            const nextCount = model.outboundCount + 1

            const delivery =
                model.outboundListenerCount === 0
                    ? "no host listeners"
                    : `${model.outboundListenerCount} listener(s) receive encoded value`

            return {
                model: evo(model, {
                    outboundCount: () => nextCount,
                    outboundLog: (log) => [
                        ...log,
                        `Port.emit({ count: ${nextCount}, source: "Click" }) → ${delivery}`,
                    ],
                }),
            }
        },

        ClickedAddOutboundListener: () => ({
            model: evo(model, {
                outboundListenerCount: (count) => count + 1,
            }),
        }),

        ClickedRemoveOutboundListener: () => ({
            model: evo(model, {
                outboundListenerCount: (count) => Math.max(0, count - 1),
            }),
        }),

        ClickedResetOutbound: () => ({
            model: evo(model, {
                outboundCount: () => 12,
                outboundListenerCount: () => 1,
                outboundLog: () => [],
            }),
        }),

        UpdatedSchemaInput: ({ value }) => ({
            model: evo(model, {
                schemaInput: () => value,
                schemaAccepted: () => false,
                schemaMessage: () => "not validated",
            }),
        }),

        ClickedValidateInbound: () => {
            let encodedStep: unknown

            try {
                encodedStep = JSON.parse(model.schemaInput)
            } catch {
                encodedStep = model.schemaInput
            }

            const exit = S.decodeUnknownExit(HostConfig)({
                step: encodedStep,
            })

            return Exit.match(exit, {
                onFailure: () => ({
                    model: evo(model, {
                        schemaAccepted: () => false,
                        schemaMessage: () =>
                            "Exit.Failure(SchemaError) · app receives nothing",
                    }),
                }),

                onSuccess: (decoded) => ({
                    model: evo(model, {
                        schemaAccepted: () => true,
                        schemaMessage: () =>
                            `Exit.Success(void) · decoded step = ${decoded.step}`,
                    }),
                }),
            })
        },

        ClickedEmbedSend: () => ({
            model: evo(model, {
                embedLog: (log) => [
                    ...log,
                    model.embedDisposed
                        ? "ports.stepChanged.send(...) after dispose → no-op"
                        : "ports.stepChanged.send(...) → validate + deliver inbound",
                ],
            }),
        }),

        ClickedEmbedSubscribe: () => ({
            model: evo(model, {
                embedLog: (log) => [
                    ...log,
                    model.embedDisposed
                        ? "ports.countChanged.subscribe(...) after dispose → inert unsubscribe"
                        : "ports.countChanged.subscribe(listener) → listener registered",
                ],
            }),
        }),

        ClickedEmbedDispose: () => ({
            model: evo(model, {
                embedDisposed: () => true,
                embedLog: (log) => [
                    ...log,
                    "handle.dispose() → runtime scope stopped + listeners cleared + DOM removed",
                ],
            }),
        }),

        ClickedResetEmbed: () => ({
            model: evo(model, {
                embedDisposed: () => false,
                embedLog: () => [],
            }),
        }),

        ClickedResetPortDemo: () => ({
            model: demoInit,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const inboundStatus = (
    model: DemoModel
): Readonly<{
    stream: string
    preAttach: string
    afterDetach: string
}> => ({
    stream: model.inboundAttached
        ? "Port.stream attached"
        : "no Port.stream attached",

    preAttach: model.inboundHasEverAttached
        ? "initial backlog phase ended"
        : "pre-first-attach sends are buffered",

    afterDetach:
        model.inboundHasEverAttached && !model.inboundAttached
            ? "new sends are dropped"
            : "n/a",
})

export const outboundStatus = (
    model: DemoModel
): Readonly<{
    listeners: string
    delivery: string
}> => ({
    listeners: `${model.outboundListenerCount} listener(s)`,

    delivery:
        model.outboundListenerCount > 0
            ? "each emitted encoded value is delivered to all listeners"
            : "emits currently have no host observer",
})

export const schemaFacts = (
    model: DemoModel
): ReadonlyArray<readonly [string, string]> => [
    ["host side", "Encoded input → handle.send(value)"],
    ["boundary", "Schema.decodeUnknownExit(port.schema)"],
    ["app side", "only decoded HostConfig reaches Port.stream"],
    ["last result", model.schemaMessage],
]

export const embedFacts = (
    model: DemoModel
): ReadonlyArray<readonly [string, string]> => [
    ["start", "Runtime.embed(program)"],
    ["inbound handle", "handle.ports.stepChanged.send(encoded)"],
    ["outbound handle", "handle.ports.countChanged.subscribe(listener)"],
    ["lifetime", model.embedDisposed ? "disposed" : "host-owned"],
]
