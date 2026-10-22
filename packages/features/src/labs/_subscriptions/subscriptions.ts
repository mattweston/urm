import {
    Duration,
    Effect,
    Equivalence,
    Match,
    Option,
    Schema as S,
    Stream,
} from "effect"
import { Subscription, type Update } from "foldkit"
import { streamFromEventFilterMap } from "foldkit/dom"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Child Submodel subscription used by Subscription.lift
// -----------------------------------------------------------------------------

export const ChildModel = S.Struct({
    isOnline: S.Boolean,
})
export type ChildModel = typeof ChildModel.Type

export const ChildMessage = defineMessageUnion({
    TickedChild: {},
})
export type ChildMessage = typeof ChildMessage.Type

export const childSubscriptions = Subscription.make<ChildModel, ChildMessage>()(
    (entry) => ({
        childPulse: entry(
            {
                isOnline: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    isOnline: model.isOnline,
                }),

                dependenciesToStream: ({ isOnline }) =>
                    Stream.when(
                        Stream.tick(Duration.seconds(2)).pipe(
                            Stream.map(ChildMessage.TickedChild)
                        ),
                        Effect.sync(() => isOnline)
                    ),
            }
        ),
    })
)

// -----------------------------------------------------------------------------
// Root teaching Model / Messages
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Lifetime", "Events", "KeepAlive", "Lift"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Lifetime",
    "Events",
    "KeepAlive",
    "Lift",
]

export const EventKey = S.Literals(["Escape", "Enter", "ArrowDown"])
export type EventKey = typeof EventKey.Type

export const Model = S.Struct({
    stage: Stage,

    // Lifetime panel
    count: S.Number,
    isAutoCounting: S.Boolean,
    unrelatedVersion: S.Number,
    lifetimeGeneration: S.Number,
    lifetimeLog: S.Array(S.String),

    // DOM event panel
    isListening: S.Boolean,
    eventKey: EventKey,
    eventLog: S.Array(S.String),

    // Keep-alive panel
    isDragging: S.Boolean,
    clientY: S.Number,
    dragGeneration: S.Number,
    liveReadCount: S.Number,
    lastReadClientY: S.Number,

    // Lift panel
    routeActive: S.Boolean,
    child: ChildModel,
    childGeneration: S.Number,
    childTickCount: S.Number,
    liftLog: S.Array(S.String),

    // Persistent entry
    heartbeatCount: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedSubscriptionsStage: {
        stage: Stage,
    },

    // Real subscription result Messages
    Ticked: {},
    PressedEscape: {},
    ReadLiveClientY: {
        clientY: S.Number,
    },
    Heartbeat: {},
    GotChildMessage: {
        message: ChildMessage,
    },

    // Visual controls
    ClickedToggleAutoCounting: {},
    ClickedUnrelatedModelChange: {},
    ClickedResetLifetime: {},

    ClickedToggleListening: {},
    SelectedSubscriptionEventKey: {
        key: EventKey,
    },
    ClickedSimulateWindowKey: {},
    ClickedResetEvents: {},

    ClickedToggleDragging: {},
    SelectedClientY: {
        clientY: S.Number,
    },
    ClickedReadLatestDependencies: {},
    ClickedResetKeepAlive: {},

    ClickedToggleRoute: {},
    ClickedToggleChildOnline: {},
    ClickedSimulateChildTick: {},
    ClickedResetLift: {},

    ClickedResetSubscriptionsDemo: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Lifetime",

    count: 0,
    isAutoCounting: false,
    unrelatedVersion: 0,
    lifetimeGeneration: 0,
    lifetimeLog: [],

    isListening: true,
    eventKey: "Escape",
    eventLog: [],

    isDragging: false,
    clientY: 120,
    dragGeneration: 0,
    liveReadCount: 0,
    lastReadClientY: 120,

    routeActive: true,
    child: ChildModel.make({
        isOnline: true,
    }),
    childGeneration: 1,
    childTickCount: 0,
    liftLog: ["gate open → childPulse active"],

    heartbeatCount: 0,
})

// -----------------------------------------------------------------------------
// Real root Subscriptions
// -----------------------------------------------------------------------------

export const baseSubscriptions = Subscription.make<Model, Message>()(
    (entry) => ({
        // Model-driven lifetime:
        // unrelated Model changes do not restart this entry.
        tick: entry(
            {
                isAutoCounting: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    isAutoCounting: model.isAutoCounting,
                }),

                dependenciesToStream: ({ isAutoCounting }) =>
                    Stream.when(
                        Stream.tick(Duration.seconds(1)).pipe(
                            Stream.map(Message.Ticked)
                        ),
                        Effect.sync(() => isAutoCounting)
                    ),
            }
        ),

        // Global DOM event, gated by Model.
        escapeKey: entry(
            {
                isListening: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    isListening: model.isListening,
                }),

                dependenciesToStream: ({ isListening }) =>
                    Stream.when(
                        streamFromEventFilterMap(
                            {
                                target: () => window,
                                type: "keydown",
                                filterMapEvent: (event) =>
                                    Match.value(event.key).pipe(
                                        Match.when("Escape", () =>
                                            Option.some(
                                                (event.preventDefault(),
                                                Message.PressedEscape())
                                            )
                                        ),
                                        Match.orElse(() => Option.none())
                                    ),
                            }
                        ),
                        Effect.sync(() => isListening)
                    ),
            }
        ),

        // One field controls lifetime; another remains live without restart.
        dragReader: entry(
            {
                isDragging: S.Boolean,
                clientY: S.Number,
            },
            {
                modelToDependencies: (model) => ({
                    isDragging: model.isDragging,
                    clientY: model.clientY,
                }),

                keepAliveEquivalence: Equivalence.Struct({
                    isDragging: Equivalence.Boolean,
                }),

                dependenciesToStream: ({ isDragging }, readDependencies) =>
                    Stream.when(
                        Stream.tick(Duration.millis(500)).pipe(
                            Stream.map(() => {
                                const { clientY } = readDependencies()

                                return Message.ReadLiveClientY({
                                    clientY,
                                })
                            })
                        ),
                        Effect.sync(() => isDragging)
                    ),
            }
        ),

        // No Model dependency at all.
        heartbeat: Subscription.persistentEntry(
            Stream.tick(Duration.seconds(10)).pipe(
                Stream.map(Message.Heartbeat)
            )
        ),
    })
)

// Lift the child's own subscription record into the parent Message universe.
// The parent route gate can tear down the whole child record without the child
// knowing about route state.
export const liftedChildSubscriptions = Subscription.lift(childSubscriptions)<
    Model,
    Message
>({
    read: (model) => Option.some(model.child),

    toParentMessage: (message) =>
        Message.GotChildMessage({
            message,
        }),

    when: (model) => model.routeActive,
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
    baseSubscriptions,
    liftedChildSubscriptions
)

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedSubscriptionsStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        // Results from real active Subscriptions.
        Ticked: () => ({
            model: modifyFields(model, {
                count: (count) => count + 1,
                lifetimeLog: (log) => [...log, "Ticked → count + 1"],
            }),
        }),

        PressedEscape: () => ({
            model: modifyFields(model, {
                eventLog: (log) => [...log, "PressedEscape"],
            }),
        }),

        ReadLiveClientY: ({ clientY }) => ({
            model: modifyFields(model, {
                liveReadCount: (count) => count + 1,
                lastReadClientY: () => clientY,
            }),
        }),

        Heartbeat: () => ({
            model: modifyFields(model, {
                heartbeatCount: (count) => count + 1,
            }),
        }),

        GotChildMessage: ({ message }) =>
            ChildMessage.match<UpdateReturn>(message, {
                TickedChild: () => ({
                    model: modifyFields(model, {
                        childTickCount: (count) => count + 1,
                        liftLog: (log) => [
                            ...log,
                            "GotChildMessage(TickedChild)",
                        ],
                    }),
                }),
            }),

        // Visual Lifetime controls. These mirror what the runtime does to
        // entry scopes when dependency records change.
        ClickedToggleAutoCounting: () => {
            const next = !model.isAutoCounting

            return {
                model: modifyFields(model, {
                    isAutoCounting: () => next,
                    lifetimeGeneration: (generation) => generation + 1,
                    lifetimeLog: (log) => [
                        ...log,
                        next
                            ? "dependency changed false → true: close old scope, open active tick scope"
                            : "dependency changed true → false: close active tick scope",
                    ],
                }),
            }
        },

        ClickedUnrelatedModelChange: () => ({
            model: modifyFields(model, {
                unrelatedVersion: (version) => version + 1,
                lifetimeLog: (log) => [
                    ...log,
                    "unrelated Model field changed: dependencies equivalent → keep current scope",
                ],
            }),
        }),

        ClickedResetLifetime: () => ({
            model: modifyFields(model, {
                count: () => 0,
                isAutoCounting: () => false,
                unrelatedVersion: () => 0,
                lifetimeGeneration: () => 0,
                lifetimeLog: () => [],
            }),
        }),

        // DOM event visual controls.
        ClickedToggleListening: () => ({
            model: modifyFields(model, {
                isListening: (listening) => !listening,
                eventLog: (log) => [
                    ...log,
                    model.isListening
                        ? "listener dependency true → false: scope closes, removeEventListener"
                        : "listener dependency false → true: scope opens, addEventListener",
                ],
            }),
        }),

        SelectedSubscriptionEventKey: ({ key }) => ({
            model: modifyFields(model, {
                eventKey: () => key,
            }),
        }),

        ClickedSimulateWindowKey: () => {
            if (!model.isListening) {
                return {
                    model: modifyFields(model, {
                        eventLog: (log) => [
                            ...log,
                            `${model.eventKey}: listener inactive`,
                        ],
                    }),
                }
            }

            if (model.eventKey === "Escape") {
                return {
                    model: modifyFields(model, {
                        eventLog: (log) => [
                            ...log,
                            "Escape → Some(PressedEscape) → preventDefault + dispatch",
                        ],
                    }),
                }
            }

            return {
                model: modifyFields(model, {
                    eventLog: (log) => [
                        ...log,
                        `${model.eventKey} → None → browser default untouched`,
                    ],
                }),
            }
        },

        ClickedResetEvents: () => ({
            model: modifyFields(model, {
                isListening: () => true,
                eventKey: () => "Escape",
                eventLog: () => [],
            }),
        }),

        // keepAliveEquivalence visual controls.
        ClickedToggleDragging: () => {
            const next = !model.isDragging

            return {
                model: modifyFields(model, {
                    isDragging: () => next,
                    dragGeneration: (generation) => generation + 1,
                    lastReadClientY: () => model.clientY,
                }),
            }
        },

        SelectedClientY: ({ clientY }) => ({
            model: modifyFields(model, {
                clientY: () => clientY,
            }),
        }),

        ClickedReadLatestDependencies: () => ({
            model: modifyFields(model, {
                liveReadCount: (count) => count + 1,
                lastReadClientY: () => model.clientY,
            }),
        }),

        ClickedResetKeepAlive: () => ({
            model: modifyFields(model, {
                isDragging: () => false,
                clientY: () => 120,
                dragGeneration: () => 0,
                liveReadCount: () => 0,
                lastReadClientY: () => 120,
            }),
        }),

        // lift / gate visual controls.
        ClickedToggleRoute: () => {
            const next = !model.routeActive

            return {
                model: modifyFields(model, {
                    routeActive: () => next,
                    childGeneration: (generation) =>
                        next ? generation + 1 : generation,
                    liftLog: (log) => [
                        ...log,
                        next
                            ? "parent gate reopened → childPulse gets fresh scope"
                            : "parent gate closed → childPulse scope torn down",
                    ],
                }),
            }
        },

        ClickedToggleChildOnline: () => {
            const next = !model.child.isOnline

            if (!model.routeActive) {
                return {
                    model: modifyFields(model, {
                        child: (child) => ({
                            ...child,
                            isOnline: next,
                        }),
                        liftLog: (log) => [
                            ...log,
                            `child isOnline → ${next} behind closed gate: no child dependency evaluation`,
                        ],
                    }),
                }
            }

            return {
                model: modifyFields(model, {
                    child: (child) => ({
                        ...child,
                        isOnline: next,
                    }),
                    childGeneration: (generation) => generation + 1,
                    liftLog: (log) => [
                        ...log,
                        `child dependency changed → isOnline ${next}: restart lifted childPulse`,
                    ],
                }),
            }
        },

        ClickedSimulateChildTick: () => ({
            model: modifyFields(model, {
                liftLog: (log) => [
                    ...log,
                    model.routeActive && model.child.isOnline
                        ? "childPulse emitted TickedChild → lifted to GotChildMessage"
                        : "no child tick: gate closed or child offline",
                ],
                childTickCount: (count) =>
                    model.routeActive && model.child.isOnline
                        ? count + 1
                        : count,
            }),
        }),

        ClickedResetLift: () => ({
            model: modifyFields(model, {
                routeActive: () => true,
                child: () =>
                    ChildModel.make({
                        isOnline: true,
                    }),
                childGeneration: () => 1,
                childTickCount: () => 0,
                liftLog: () => ["gate open → childPulse active"],
            }),
        }),

        ClickedResetSubscriptionsDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const lifetimeState = (
    model: Model
): Readonly<{
    dependencies: string
    scope: string
    generation: string
}> => ({
    dependencies: `{ isAutoCounting: ${model.isAutoCounting} }`,
    scope: model.isAutoCounting ? "active Stream.tick" : "inactive Stream.when",
    generation: `scope generation ${model.lifetimeGeneration}`,
})

export const eventPreview = (
    model: Model
): Readonly<{
    key: string
    output: string
    preventDefault: string
}> => {
    if (!model.isListening) {
        return {
            key: model.eventKey,
            output: "listener inactive",
            preventDefault: "no listener",
        }
    }

    if (model.eventKey === "Escape") {
        return {
            key: model.eventKey,
            output: "Option.some(PressedEscape)",
            preventDefault: "yes",
        }
    }

    return {
        key: model.eventKey,
        output: "Option.none()",
        preventDefault: "no",
    }
}

export const keepAliveState = (
    model: Model
): Readonly<{
    dependencies: string
    compared: string
    live: string
}> => ({
    dependencies: `{ isDragging: ${model.isDragging}, clientY: ${model.clientY} }`,
    compared: "{ isDragging } only",
    live: `readDependencies().clientY = ${model.clientY}`,
})

export const liftState = (
    model: Model
): Readonly<{
    gate: string
    childDependencies: string
    active: string
}> => ({
    gate: model.routeActive ? "open" : "closed",
    childDependencies: `{ isOnline: ${model.child.isOnline} }`,
    active:
        model.routeActive && model.child.isOnline
            ? "childPulse active"
            : "childPulse inactive",
})
