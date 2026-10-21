import { Duration, Effect, Pool, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN RESOURCE
// -----------------------------------------------------------------------------

export type Connection = Readonly<{
    id: number
    query: (sql: string) => Effect.Effect<string>
    close: Effect.Effect<void>
}>

let connection_sequence = 0

export const acquire_connection = Effect.acquireRelease(
    Effect.sync((): Connection => {
        connection_sequence += 1

        const id = connection_sequence

        return {
            id,
            query: (sql: string) => Effect.succeed(`connection-${id}: ${sql}`),
            close: Effect.void,
        }
    }),
    (connection: Connection) => connection.close
)

export const fixed_pool_program = Effect.scoped(
    Effect.gen(function* () {
        const pool = yield* Pool.make({
            acquire: acquire_connection,
            size: 2,
        })

        const result = yield* Pool.use(pool, (connection: Connection) =>
            connection.query("select 1")
        )

        return {
            result,
            minSize: pool.config.minSize,
            maxSize: pool.config.maxSize,
            concurrency: pool.config.concurrency,
        } as const
    })
)

export const elastic_pool_program = Effect.scoped(
    Effect.gen(function* () {
        const pool = yield* Pool.makeWithTTL({
            acquire: acquire_connection,
            min: 1,
            max: 4,
            concurrency: 2,
            targetUtilization: 0.75,
            timeToLive: Duration.seconds(30),
            timeToLiveStrategy: "usage",
        })

        return {
            min: pool.config.minSize,
            max: pool.config.maxSize,
            concurrency: pool.config.concurrency,
            targetUtilization: pool.config.targetUtilization,
        } as const
    })
)

export const scoped_get_program = Effect.scoped(
    Effect.gen(function* () {
        const pool = yield* Pool.make({
            acquire: acquire_connection,
            size: 1,
        })

        const connection = yield* Pool.get(pool)

        return yield* connection.query("select scoped")
    })
)

export const use_program = Effect.scoped(
    Effect.gen(function* () {
        const pool = yield* Pool.make({
            acquire: acquire_connection,
            size: 1,
        })

        return yield* Pool.use(pool, (connection: Connection) =>
            connection.query("select use")
        )
    })
)

export const custom_strategy: Pool.Strategy<Connection, never> = {
    run: (_pool: Pool.Pool<Connection, never>) => Effect.void,
    onAcquire: (_item: Pool.PoolItem<Connection, never>) => Effect.void,
    reclaim: (_pool: Pool.Pool<Connection, never>) => Effect.succeed(undefined),
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Borrow"),
    S.Literal("Scale"),
    S.Literal("Health"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Borrow",
    "Scale",
    "Health",
]

export const BuildCase = S.Union([
    S.Literal("Fixed"),
    S.Literal("Models"),
    S.Literal("Guard"),
])
export type BuildCase = typeof BuildCase.Type

export const BorrowCase = S.Union([
    S.Literal("Get"),
    S.Literal("Use"),
    S.Literal("Concurrency"),
])
export type BorrowCase = typeof BorrowCase.Type

export const ScaleCase = S.Union([
    S.Literal("TTL"),
    S.Literal("Utilization"),
    S.Literal("Strategy"),
])
export type ScaleCase = typeof ScaleCase.Type

export const HealthCase = S.Union([
    S.Literal("Invalidate"),
    S.Literal("Reserve"),
    S.Literal("Shutdown"),
])
export type HealthCase = typeof HealthCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    borrowCase: BorrowCase,
    scaleCase: ScaleCase,
    healthCase: HealthCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Build: {
        eyebrow: "scoped resource sharing",
        title: "Build a pool around a scoped acquisition effect and let the pool own resource lifetime",
        description:
            "Pool<A, E> stores reusable scoped resources. make creates a fixed-size pool; makeWithTTL and makeWithStrategy create elastic/custom pools. The pool itself exposes normalized Config and mutable State for inspection and strategy support.",
        code: `const pool =
    yield* Pool.make({
        acquire:
            acquireConnection,
        size:
            2,
        concurrency:
            1
    })

pool.config.minSize
// 2

pool.config.maxSize
// 2

Pool.isPool(
    pool
)
// true`,
        apis: [
            "Pool.Pool",
            "Pool.Config",
            "Pool.State",
            "Pool.PoolItem",
            "Pool.Strategy",
            "Pool.isPool",
            "Pool.make",
        ],
        notice: "Pool construction requires Scope because closing the pool scope shuts the pool down and releases all acquired items. Fixed pools use the same min and max size.",
    },

    Borrow: {
        eyebrow: "borrow, use, then return",
        title: "Choose scoped get for scope-bound borrowing or use for one-effect borrowing without an extra scope",
        description:
            "get borrows an item for the lifetime of the current Scope and automatically returns it when that scope closes. use borrows an item only while one Effect runs and returns it on every exit, avoiding an extra child scope/finalizer registration.",
        code: `const connection =
    yield* Pool.get(
        pool
    )

// returned when current
// Scope closes

const result =
    yield* Pool.use(
        pool,
        (
            connection
        ) =>
            connection.query(
                "select 1"
            )
    )

// item already returned here`,
        apis: ["Pool.get", "Pool.use"],
        notice: "If every usable slot is busy and the pool cannot grow, borrowing waits. Acquisition failure is exposed through get/use as the pool's E error type.",
    },

    Scale: {
        eyebrow: "size × per-item concurrency × utilization",
        title: "Grow toward demand, then reclaim excess items with TTL or a custom strategy",
        description:
            "makeWithTTL accepts min/max bounds, per-item concurrency, target utilization, and a TTL policy. The pool computes a target item count from current usage, utilization, and concurrency, then clamps it between min and max.",
        code: `const pool =
    yield* Pool.makeWithTTL({
        acquire:
            acquireConnection,
        min:
            1,
        max:
            4,
        concurrency:
            2,
        targetUtilization:
            0.75,
        timeToLive:
            Duration.seconds(
                30
            ),
        timeToLiveStrategy:
            "usage"
    })

// total usable slots:
// up to max × concurrency
// = 8`,
        apis: [
            "Pool.makeWithTTL",
            "Pool.makeWithStrategy",
            "Pool.Strategy",
            "Pool.Config",
        ],
        notice: "targetUtilization is clamped to 0.1…1. The default TTL strategy is usage; creation measures expiry from item creation instead. Per-item concurrency defaults to 1.",
    },

    Health: {
        eyebrow: "remove unhealthy items or reserve capacity",
        title: "Invalidate broken resources and reserve a leased item's remaining capacity when exclusive access is needed",
        description:
            "invalidate finds an item by strict equality and removes it from future reuse, triggering replacement when needed. reserve is scoped: for per-item concurrency above 1 it removes the item's remaining shared capacity until the reservation scope closes.",
        code: `const connection =
    yield* Pool.get(
        pool
    )

yield* Pool.invalidate(
    pool,
    connection
)

// strict identity match

yield* Pool.reserve(
    pool,
    connection
)

// remaining capacity is
// reserved until this
// reservation scope closes`,
        apis: [
            "Pool.invalidate",
            "Pool.reserve",
            "Pool.State",
            "Pool.PoolItem",
        ],
        notice: "reserve does not wait for leases already using the item; it only removes remaining capacity from shared circulation. It is a no-op when per-item concurrency is 1 or the pool does not contain that exact item.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    exports: string
    fixed: string
    config: string
    state: string
    poolItem: string
    guard: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => ({
    mode: model.buildCase,
    exports: "13 public exports",
    fixed: "make({ size: 2 }) → minSize 2 · maxSize 2",
    config: "acquire · concurrency · isFixed · minSize · maxSize · strategy · targetUtilization",
    state: "scope · usage · items · available list · invalidated · waiters · shutdown",
    poolItem: "Exit + finalizer + refCount + availability links + release",
    guard: "isPool(unknown) checks the runtime Pool type marker",
})

export type BorrowSnapshot = Readonly<{
    mode: BorrowCase
    get: string
    use: string
    waiting: string
    concurrencyOne: string
    concurrencyThree: string
    release: string
}>

export const borrow_snapshot = (model: Model): BorrowSnapshot => ({
    mode: model.borrowCase,
    get: "get → Effect<A, E, Scope.Scope> · lease lasts until scope close",
    use: "use → callback Effect · item returned when callback exits",
    waiting: "no free slot + cannot grow → borrower waits",
    concurrencyOne: "concurrency 1 → one borrower per item",
    concurrencyThree:
        "concurrency 3 → up to three simultaneous borrowers per item",
    release: "success · failure · interruption all return the lease",
})

export type ScaleSnapshot = Readonly<{
    mode: ScaleCase
    minMax: string
    slots: string
    utilization: string
    clamp: string
    ttlUsage: string
    ttlCreation: string
    strategy: string
}>

export const scale_snapshot = (model: Model): ScaleSnapshot => ({
    mode: model.scaleCase,
    minMax: "min 1 · max 4",
    slots: "max 4 × concurrency 2 → up to 8 simultaneous leases",
    utilization:
        "target size ≈ ceil((usage / targetUtilization) / concurrency)",
    clamp: "targetUtilization normalized to 0.1…1",
    ttlUsage: '"usage" → reclaim excess after periods of pool usage / idleness',
    ttlCreation: '"creation" → age each item from acquisition time',
    strategy: "run(pool) · onAcquire(item) · reclaim(pool)",
})

export type HealthSnapshot = Readonly<{
    mode: HealthCase
    invalidate: string
    equality: string
    replacement: string
    reserve: string
    reserveNoop: string
    shutdown: string
}>

export const health_snapshot = (model: Model): HealthSnapshot => ({
    mode: model.healthCase,
    invalidate: "broken item → remove from reuse",
    equality: "item match uses === strict identity",
    replacement:
        "invalidating reduces active size and triggers resize / replacement",
    reserve:
        "leased item → remaining concurrency removed until reservation scope closes",
    reserveNoop: "concurrency 1 or missing item → no-op",
    shutdown:
        "pool scope close waits for active leases and finalizes acquired items",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPoolStage: {
        stage: Stage,
    },
    SelectedPoolBuildCase: {
        buildCase: BuildCase,
    },
    SelectedPoolBorrowCase: {
        borrowCase: BorrowCase,
    },
    SelectedPoolScaleCase: {
        scaleCase: ScaleCase,
    },
    SelectedPoolHealthCase: {
        healthCase: HealthCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Fixed",
    borrowCase: "Get",
    scaleCase: "TTL",
    healthCase: "Invalidate",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type BorrowCasePayload = Readonly<{
    borrowCase: BorrowCase
}>

type ScaleCasePayload = Readonly<{
    scaleCase: ScaleCase
}>

type HealthCasePayload = Readonly<{
    healthCase: HealthCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPoolStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedPoolBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedPoolBorrowCase: ({ borrowCase }: BorrowCasePayload) => ({
            model: evo(model, {
                borrowCase: () => borrowCase,
            }),
        }),

        SelectedPoolScaleCase: ({ scaleCase }: ScaleCasePayload) => ({
            model: evo(model, {
                scaleCase: () => scaleCase,
            }),
        }),

        SelectedPoolHealthCase: ({ healthCase }: HealthCasePayload) => ({
            model: evo(model, {
                healthCase: () => healthCase,
            }),
        }),
    })
