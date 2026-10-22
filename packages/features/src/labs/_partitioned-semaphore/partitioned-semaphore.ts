import { Effect, Option, PartitionedSemaphore, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL EFFECT PROGRAMS
// -----------------------------------------------------------------------------

export const build_probe = Effect.gen(function* () {
    const semaphore = yield* PartitionedSemaphore.make<string>({
        permits: 3,
    })

    const capacity = PartitionedSemaphore.capacity(semaphore)

    const available = yield* PartitionedSemaphore.available(semaphore)

    return {
        capacity,
        available,
    } as const
})

export const manual_probe = Effect.gen(function* () {
    const semaphore = yield* PartitionedSemaphore.make<string>({
        permits: 3,
    })

    yield* PartitionedSemaphore.take(semaphore, "alpha", 2)

    const afterTake = yield* PartitionedSemaphore.available(semaphore)

    const afterRelease = yield* PartitionedSemaphore.release(semaphore, 1)

    return {
        afterTake,
        afterRelease,
    } as const
})

export const guarded_probe = Effect.gen(function* () {
    const semaphore = yield* PartitionedSemaphore.make<string>({
        permits: 2,
    })

    const one = yield* PartitionedSemaphore.withPermit(
        semaphore,
        "alpha",
        Effect.succeed("one permit")
    )

    const two = yield* PartitionedSemaphore.withPermits(
        semaphore,
        "beta",
        2,
        Effect.succeed("two permits")
    )

    return [one, two] as const
})

export const try_probe = Effect.gen(function* () {
    const semaphore = yield* PartitionedSemaphore.make<string>({
        permits: 1,
    })

    yield* PartitionedSemaphore.take(semaphore, "holder", 1)

    let executed = false

    const result = yield* PartitionedSemaphore.withPermitsIfAvailable(
        semaphore,
        1,
        Effect.sync(() => {
            executed = true
            return "ran"
        })
    )

    return {
        isNone: Option.isNone(result),
        executed,
    } as const
})

export const zero_permit_probe = Effect.gen(function* () {
    const semaphore = yield* PartitionedSemaphore.make<string>({
        permits: 1,
    })

    let executed = false

    yield* PartitionedSemaphore.withPermits(
        semaphore,
        "alpha",
        0,
        Effect.sync(() => {
            executed = true
        })
    )

    const available = yield* PartitionedSemaphore.available(semaphore)

    return {
        executed,
        available,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Acquire"),
    S.Literal("Fairness"),
    S.Literal("Try"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Acquire",
    "Fairness",
    "Try",
]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Capacity"),
    S.Literal("Unbounded"),
])
export type BuildCase = typeof BuildCase.Type

export const AcquireCase = S.Union([
    S.Literal("TakeRelease"),
    S.Literal("WithPermit"),
    S.Literal("Weighted"),
])
export type AcquireCase = typeof AcquireCase.Type

export const FairnessCase = S.Union([
    S.Literal("Partitions"),
    S.Literal("RoundRobin"),
    S.Literal("Interrupt"),
])
export type FairnessCase = typeof FairnessCase.Type

export const TryCase = S.Union([
    S.Literal("Some"),
    S.Literal("None"),
    S.Literal("Zero"),
])
export type TryCase = typeof TryCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    acquireCase: AcquireCase,
    fairnessCase: FairnessCase,
    tryCase: TryCase,
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
        eyebrow: "one shared capacity, keyed waiter groups",
        title: "Create a shared permit pool whose waiting work is partitioned by key",
        description:
            "PartitionedSemaphore<K> has one fixed capacity shared by every key. make constructs it inside Effect; makeUnsafe constructs synchronously. available is an Effect snapshot of free permits, while capacity is the fixed configured maximum.",
        code: `const semaphore =
    yield* PartitionedSemaphore.make<
        string
    >({
        permits: 3
    })

PartitionedSemaphore.capacity(
    semaphore
)
// 3

yield* PartitionedSemaphore.available(
    semaphore
)
// 3

const unsafe =
    PartitionedSemaphore.makeUnsafe<
        string
    >({
        permits: 3
    })`,
        apis: [
            "PartitionedSemaphore.PartitionedTypeId",
            "PartitionedSemaphore.PartitionedSemaphore",
            "PartitionedSemaphore.Partitioned",
            "PartitionedSemaphore.make",
            "PartitionedSemaphore.makeUnsafe",
            "PartitionedSemaphore.capacity",
            "PartitionedSemaphore.available",
        ],
        notice: "Negative capacity is clamped to 0. A non-finite configured permit count creates an unbounded semaphore whose acquire/release operations complete immediately.",
    },

    Acquire: {
        eyebrow: "manual or scoped weighted permits",
        title: "Acquire permits for a partition manually or bracket work with automatic release",
        description:
            "take(key, permits) waits when necessary; release returns permits to the shared pool. withPermit guards work with one permit, while withPermits supports weighted work and guarantees release after success, failure, or interruption.",
        code: `yield* PartitionedSemaphore.take(
    semaphore,
    "alpha",
    2
)

yield* PartitionedSemaphore.release(
    semaphore,
    2
)

yield* PartitionedSemaphore.withPermit(
    semaphore,
    "alpha",
    task
)

yield* PartitionedSemaphore.withPermits(
    semaphore,
    "beta",
    3,
    heavyTask
)`,
        apis: [
            "PartitionedSemaphore.take",
            "PartitionedSemaphore.release",
            "PartitionedSemaphore.withPermit",
            "PartitionedSemaphore.withPermits",
        ],
        notice: "Requests for more permits than capacity never complete. Zero or negative permit requests complete immediately; withPermits then runs the wrapped Effect without acquiring anything.",
    },

    Fairness: {
        eyebrow: "partition-aware waiter scheduling",
        title: "Released permits rotate across waiting partition keys instead of one busy key monopolizing progress",
        description:
            "Waiters are grouped by partition key in a MutableHashMap. When permits are released, the implementation walks those partitions in round-robin order, giving one permit at a time to a waiter before advancing through the partition iterator.",
        code: `// shared capacity = 2

// partition "alpha"
take(
    "alpha",
    3
)

// partition "beta"
take(
    "beta",
    1
)

// released permits are assigned
// across waiting partitions
// in round-robin order`,
        apis: [
            "PartitionedSemaphore.take",
            "PartitionedSemaphore.release",
            "PartitionedSemaphore.withPermits",
        ],
        notice: "The fairness unit is the partition key, not a permanently reserved per-key quota. Every partition still competes for the same shared permit pool.",
    },

    Try: {
        eyebrow: "non-blocking admission",
        title: "Run work only when permits are immediately available, returning Some or None",
        description:
            "withPermitsIfAvailable never waits. If enough permits are free, it runs the Effect and returns Some(result), releasing the permits afterward. If not, it returns None and does not run the Effect at all.",
        code: `const result =
    yield* PartitionedSemaphore
        .withPermitsIfAvailable(
            semaphore,
            2,
            task
        )

Option.match(
    result,
    {
        onNone:
            () =>
                "skipped",
        onSome:
            (
                value
            ) =>
                value
    }
)`,
        apis: [
            "PartitionedSemaphore.withPermitsIfAvailable",
            "PartitionedSemaphore.available",
            "Option.Option",
        ],
        notice: "Unlike take / withPermits, the immediate-availability helper has no partition key because it never queues a waiter. Zero or negative permits always run the Effect and return Some.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    exportNames: string
    typeId: string
    capacity: string
    available: string
    negative: string
    unbounded: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => ({
    mode: model.buildCase,
    exportNames: "12 exported names",
    typeId: PartitionedSemaphore.PartitionedTypeId,
    capacity: "capacity = fixed configured permit maximum",
    available: "available = Effect<number> snapshot of currently free permits",
    negative: "permits < 0 → capacity 0",
    unbounded: "non-finite permits → acquire/release are immediate",
})

export type AcquireSnapshot = Readonly<{
    mode: AcquireCase
    start: string
    takeTwo: string
    releaseOne: string
    withPermit: string
    weighted: string
    tooLarge: string
    zero: string
}>

export const acquire_snapshot = (model: Model): AcquireSnapshot => ({
    mode: model.acquireCase,
    start: "capacity 3 · available 3",
    takeTwo: 'take("alpha", 2) → available 1',
    releaseOne: "release(1) → available 2",
    withPermit: 'withPermit("alpha") → acquire 1 / always release',
    weighted: 'withPermits("beta", 3) → weighted guarded work',
    tooLarge: "requested permits > capacity → waits forever",
    zero: "permits ≤ 0 → no acquisition",
})

export type FairnessSnapshot = Readonly<{
    mode: FairnessCase
    shared: string
    partitions: string
    releaseFlow: string
    grouped: string
    cleanup: string
    interrupt: string
}>

export const fairness_snapshot = (model: Model): FairnessSnapshot => ({
    mode: model.fairnessCase,
    shared: "all keys share one capacity",
    partitions: "alpha waiters · beta waiters · gamma waiters",
    releaseFlow: "released permit → alpha → beta → gamma → rotate",
    grouped: "MutableHashMap<K, Set<Waiter>>",
    cleanup: "empty waiter sets remove their partition entry",
    interrupt: "interrupted partial waiter returns already-assigned permits",
})

export type TrySnapshot = Readonly<{
    mode: TryCase
    success: string
    unavailable: string
    executesOnNone: string
    releases: string
    zero: string
    keyed: string
}>

export const try_snapshot = (model: Model): TrySnapshot => ({
    mode: model.tryCase,
    success: "enough free permits → Some(result)",
    unavailable: "not enough now → None immediately",
    executesOnNone: "wrapped Effect does not run on None",
    releases: "Some path releases permits on every exit",
    zero: "permits ≤ 0 → Some(result) without acquiring",
    keyed: "no key parameter: immediate checks never join partition queues",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPartitionedSemaphoreStage: {
        stage: Stage,
    },
    SelectedPartitionedSemaphoreBuildCase: {
        buildCase: BuildCase,
    },
    SelectedPartitionedSemaphoreAcquireCase: {
        acquireCase: AcquireCase,
    },
    SelectedPartitionedSemaphoreFairnessCase: {
        fairnessCase: FairnessCase,
    },
    SelectedPartitionedSemaphoreTryCase: {
        tryCase: TryCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    acquireCase: "TakeRelease",
    fairnessCase: "Partitions",
    tryCase: "Some",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type AcquireCasePayload = Readonly<{
    acquireCase: AcquireCase
}>

type FairnessCasePayload = Readonly<{
    fairnessCase: FairnessCase
}>

type TryCasePayload = Readonly<{
    tryCase: TryCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPartitionedSemaphoreStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedPartitionedSemaphoreBuildCase: ({
            buildCase,
        }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedPartitionedSemaphoreAcquireCase: ({
            acquireCase,
        }: AcquireCasePayload) => ({
            model: modifyFields(model, {
                acquireCase: () => acquireCase,
            }),
        }),

        SelectedPartitionedSemaphoreFairnessCase: ({
            fairnessCase,
        }: FairnessCasePayload) => ({
            model: modifyFields(model, {
                fairnessCase: () => fairnessCase,
            }),
        }),

        SelectedPartitionedSemaphoreTryCase: ({ tryCase }: TryCasePayload) => ({
            model: modifyFields(model, {
                tryCase: () => tryCase,
            }),
        }),
    })
