import { Effect, Layer, Match as M, Ref, Schema as S } from "effect"
import { ClusterSchema, Entity, TestRunner } from "effect/cluster"
import { Rpc } from "effect/rpc"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Cluster example
// -----------------------------------------------------------------------------

export const Increment = Rpc.make("Increment", {
    payload: { amount: S.Int },
    success: S.Int,
})

export const GetCount = Rpc.make("GetCount", {
    success: S.Int,
}).annotate(ClusterSchema.Persisted, true)

export const Counter = Entity.make("Counter", [Increment, GetCount])

// Each entity activation gets its own handler state.
// counter-123 and counter-456 therefore get independent Refs.
export const CounterEntityLayer = Counter.toLayer(
    Effect.gen(function* () {
        const count = yield* Ref.make(0)

        return Counter.of({
            Increment: ({ payload }) =>
                Ref.updateAndGet(count, (current) => current + payload.amount),
            GetCount: () => Ref.get(count),
        })
    }),
    {
        maxIdleTime: "5 minutes",
        mailboxCapacity: 128,
    }
)

// TestRunner gives you the real entity + sharding model in one process with
// in-memory runner/message storage, so it is ideal for local examples/tests.
export const TestLayer = CounterEntityLayer.pipe(
    Layer.provideMerge(TestRunner.layer)
)

export const useCounter = Effect.gen(function* () {
    const clientFor = yield* Counter.client

    const counterA = clientFor("counter-123")
    const counterB = clientFor("counter-456")

    const a1 = yield* counterA.Increment({ amount: 1 })
    const a2 = yield* counterA.Increment({ amount: 4 })
    const b1 = yield* counterB.Increment({ amount: 2 })

    return {
        counterA: a2,
        counterB: b1,
        firstIncrement: a1,
    }
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Entity"),
    S.Literal("Routing"),
    S.Literal("Rebalance"),
    S.Literal("Lifecycle"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Entity",
    "Routing",
    "Rebalance",
    "Lifecycle",
]

export const EntityId = S.Union([
    S.Literal("counter-123"),
    S.Literal("counter-456"),
    S.Literal("cart-9"),
])
export type EntityId = typeof EntityId.Type

export const LifecycleStatus = S.Union([
    S.Literal("Dormant"),
    S.Literal("Active"),
    S.Literal("Passivated"),
])
export type LifecycleStatus = typeof LifecycleStatus.Type

export const Model = S.Struct({
    stage: Stage,

    counter_a: S.Number,
    counter_b: S.Number,

    routing_entity_id: EntityId,

    has_third_runner: S.Boolean,

    lifecycle_status: LifecycleStatus,
    lifecycle_count: S.Number,
    lifecycle_generation: S.Number,
    lifecycle_log: S.Array(S.String),
})
export type Model = typeof Model.Type

export const SelectedClusterStage = taggedStruct("SelectedClusterStage", {
    stage: Stage,
})

export const ClickedIncrementCounterA = taggedStruct("ClickedIncrementCounterA")
export const ClickedIncrementCounterB = taggedStruct("ClickedIncrementCounterB")
export const ClickedResetClusterCounters = taggedStruct(
    "ClickedResetClusterCounters"
)

export const SelectedClusterEntityId = taggedStruct("SelectedClusterEntityId", {
    entity_id: EntityId,
})

export const ClickedToggleThirdRunner = taggedStruct("ClickedToggleThirdRunner")

export const ClickedActivateClusterEntity = taggedStruct(
    "ClickedActivateClusterEntity"
)
export const ClickedIncrementActiveClusterEntity = taggedStruct(
    "ClickedIncrementActiveClusterEntity"
)
export const ClickedPassivateClusterEntity = taggedStruct(
    "ClickedPassivateClusterEntity"
)
export const ClickedReactivateClusterEntity = taggedStruct(
    "ClickedReactivateClusterEntity"
)
export const ClickedResetClusterLifecycle = taggedStruct(
    "ClickedResetClusterLifecycle"
)

export const Message = S.Union([
    SelectedClusterStage,

    ClickedIncrementCounterA,
    ClickedIncrementCounterB,
    ClickedResetClusterCounters,

    SelectedClusterEntityId,

    ClickedToggleThirdRunner,

    ClickedActivateClusterEntity,
    ClickedIncrementActiveClusterEntity,
    ClickedPassivateClusterEntity,
    ClickedReactivateClusterEntity,
    ClickedResetClusterLifecycle,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Entity",

    counter_a: 0,
    counter_b: 0,

    routing_entity_id: "counter-123",

    has_third_runner: false,

    lifecycle_status: "Dormant",
    lifecycle_count: 0,
    lifecycle_generation: 0,
    lifecycle_log: [],
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedClusterStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            ClickedIncrementCounterA: () => ({
                model: modifyFields(model, {
                    counter_a: (count) => count + 1,
                }),
                commands: [],
            }),

            ClickedIncrementCounterB: () => ({
                model: modifyFields(model, {
                    counter_b: (count) => count + 1,
                }),
                commands: [],
            }),

            ClickedResetClusterCounters: () => ({
                model: modifyFields(model, {
                    counter_a: () => 0,
                    counter_b: () => 0,
                }),
                commands: [],
            }),

            SelectedClusterEntityId: ({ entity_id }) => ({
                model: modifyFields(model, {
                    routing_entity_id: () => entity_id,
                }),
                commands: [],
            }),

            ClickedToggleThirdRunner: () => ({
                model: modifyFields(model, {
                    has_third_runner: (value) => !value,
                }),
                commands: [],
            }),

            ClickedActivateClusterEntity: () => ({
                model: modifyFields(model, {
                    lifecycle_status: () => "Active",
                    lifecycle_generation: (generation) => generation + 1,
                    lifecycle_count: () => 0,
                    lifecycle_log: (log) => [
                        ...log,
                        "message arrived for inactive entity",
                        "entity handler activated",
                        "Ref.make(0) created",
                    ],
                }),
                commands: [],
            }),

            ClickedIncrementActiveClusterEntity: () => {
                if (model.lifecycle_status !== "Active") {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        lifecycle_count: (count) => count + 1,
                        lifecycle_log: (log) => [
                            ...log,
                            `Increment handled → ${model.lifecycle_count + 1}`,
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedPassivateClusterEntity: () => {
                if (model.lifecycle_status !== "Active") {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        lifecycle_status: () => "Passivated",
                        lifecycle_log: (log) => [
                            ...log,
                            "maxIdleTime elapsed",
                            "entity activation stopped",
                            "in-memory Ref released",
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedReactivateClusterEntity: () => {
                if (model.lifecycle_status !== "Passivated") {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        lifecycle_status: () => "Active",
                        lifecycle_generation: (generation) => generation + 1,
                        lifecycle_count: () => 0,
                        lifecycle_log: (log) => [
                            ...log,
                            "new message arrived",
                            "entity activated again",
                            "new Ref.make(0) created",
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetClusterLifecycle: () => ({
                model: modifyFields(model, {
                    lifecycle_status: () => "Dormant",
                    lifecycle_count: () => 0,
                    lifecycle_generation: () => 0,
                    lifecycle_log: () => [],
                }),
                commands: [],
            }),
        })
    )

// Teaching-only deterministic mapping used by the visual panel.
// The real cluster runtime computes this through Sharding.getShardId.
export const demo_shard_id = (entity_id: EntityId): number => {
    switch (entity_id) {
        case "counter-123":
            return 7
        case "counter-456":
            return 2
        case "cart-9":
            return 10
    }
}

export const runner_names = (
    has_third_runner: boolean
): ReadonlyArray<string> =>
    has_third_runner
        ? ["runner-a", "runner-b", "runner-c"]
        : ["runner-a", "runner-b"]

export const owner_for_shard = (
    shard_id: number,
    has_third_runner: boolean
): string => {
    const runners = runner_names(has_third_runner)
    return runners[(shard_id - 1) % runners.length]!
}

export const routed_runner = (model: Model): string =>
    owner_for_shard(
        demo_shard_id(model.routing_entity_id),
        model.has_third_runner
    )

export const moved_shards = (): ReadonlyArray<number> =>
    Array.from({ length: 12 }, (_, index) => index + 1).filter(
        (shard_id) =>
            owner_for_shard(shard_id, false) !== owner_for_shard(shard_id, true)
    )
