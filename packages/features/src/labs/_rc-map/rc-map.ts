import { Effect, Option, RcMap, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL RCMAP PROGRAMS
// -----------------------------------------------------------------------------

export type Resource = Readonly<{
    key: string
    version: number
}>

let resource_sequence = 0

export const acquire_resource = (key: string) =>
    Effect.acquireRelease(
        Effect.sync((): Resource => {
            resource_sequence += 1

            return {
                key,
                version: resource_sequence,
            }
        }),
        (_resource: Resource) => Effect.void
    )

export const shared_resource_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* RcMap.make({
            lookup: acquire_resource,
            idleTimeToLive: "1 minute",
        })

        const first = yield* RcMap.get(map, "database")

        const second = yield* RcMap.get(map, "database")

        return {
            sameObject: first === second,
            first,
            second,
        } as const
    })
)

export const cached_only_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* RcMap.make({
            lookup: acquire_resource,
            idleTimeToLive: "1 minute",
        })

        const missing = yield* Effect.scoped(RcMap.getOption(map, "api"))

        yield* Effect.scoped(RcMap.get(map, "api"))

        const cached = yield* Effect.scoped(RcMap.getOption(map, "api"))

        return {
            missing: Option.isNone(missing),
            cached: Option.isSome(cached),
        } as const
    })
)

export const capacity_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* RcMap.make({
            lookup: acquire_resource,
            capacity: 2,
            idleTimeToLive: "1 minute",
        })

        yield* RcMap.get(map, "alpha")

        yield* RcMap.get(map, "beta")

        return yield* Effect.result(RcMap.get(map, "gamma"))
    })
)

export const lifecycle_program = Effect.scoped(
    Effect.gen(function* () {
        const map = yield* RcMap.make({
            lookup: acquire_resource,
            idleTimeToLive: "1 minute",
        })

        yield* Effect.scoped(RcMap.get(map, "session"))

        const before = yield* RcMap.has(map, "session")

        yield* RcMap.touch(map, "session")

        const keysBefore = Array.from(yield* RcMap.keys(map))

        yield* RcMap.invalidate(map, "session")

        const after = yield* RcMap.has(map, "session")

        return {
            before,
            after,
            keysBefore,
        } as const
    })
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Acquire"),
    S.Literal("Retain"),
    S.Literal("Lifecycle"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Acquire",
    "Retain",
    "Lifecycle",
]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Capacity"),
    S.Literal("State"),
])
export type BuildCase = typeof BuildCase.Type

export const AcquireCase = S.Union([
    S.Literal("Lazy"),
    S.Literal("Share"),
    S.Literal("Scope"),
])
export type AcquireCase = typeof AcquireCase.Type

export const RetainCase = S.Union([
    S.Literal("Option"),
    S.Literal("Has"),
    S.Literal("Keys"),
])
export type RetainCase = typeof RetainCase.Type

export const LifecycleCase = S.Union([
    S.Literal("TTL"),
    S.Literal("Touch"),
    S.Literal("Invalidate"),
])
export type LifecycleCase = typeof LifecycleCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    acquireCase: AcquireCase,
    retainCase: RetainCase,
    lifecycleCase: LifecycleCase,
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
        eyebrow: "reference-counted resources indexed by key",
        title: "Create one scoped map that lazily owns and shares resource lifecycles",
        description:
            "RcMap.make stores a lookup Effect, the captured Context, its owning Scope, per-key idle TTL policy, capacity, and open/closed State. Capacity is optional; supplying it adds ExceededCapacityError to the resource error type.",
        code: `const map =
    yield* RcMap.make({
        lookup:
            (
                key: string
            ) =>
                Effect.acquireRelease(
                    open(key),
                    close
                ),
        capacity:
            10,
        idleTimeToLive:
            (
                key
            ) =>
                key.startsWith(
                    "hot:"
                )
                    ? "5 minutes"
                    : "30 seconds"
    })

map.state._tag
// "Open"`,
        apis: [
            "RcMap.RcMap",
            "RcMap.State",
            "RcMap.State.Open",
            "RcMap.State.Closed",
            "RcMap.State.Entry",
            "RcMap.make",
        ],
        notice: "Without capacity the map is effectively unbounded. A supplied capacity is clamped to at least 0 and counts stored entries, including idle entries retained by TTL.",
    },

    Acquire: {
        eyebrow: "first caller acquires · later callers share",
        title: "Use get to retain one keyed resource for the lifetime of the caller's Scope",
        description:
            "The first get for a key creates an Entry and starts the lookup in that entry's own scope. Concurrent or later callers for the same stored key increment refCount and await the same Deferred. Each caller installs a release finalizer in its current Scope.",
        code: `const first =
    yield* RcMap.get(
        map,
        "database"
    )

const second =
    yield* RcMap.get(
        map,
        "database"
    )

// same stored entry
// lookup runs once
// refCount is incremented

// caller scope closes
//   ↓
// one reference released`,
        apis: ["RcMap.get", "RcMap.State.Entry"],
        notice: "When the final reference leaves, idleTimeToLive decides whether the entry closes immediately, stays cached temporarily, or remains idle indefinitely.",
    },

    Retain: {
        eyebrow: "inspect or retain only what is already stored",
        title: "Use getOption for cached-only borrowing, has for presence, and keys for current entries",
        description:
            "getOption never invokes lookup for a missing key and never consumes capacity for a miss. If an entry exists it increments refCount and awaits the same in-flight/cached result. has only checks presence; keys enumerates current stored keys.",
        code: `const missing =
    yield* RcMap.getOption(
        map,
        "database"
    )
// None when absent
// no lookup

yield* Effect.scoped(
    RcMap.get(
        map,
        "database"
    )
)

const cached =
    yield* RcMap.getOption(
        map,
        "database"
    )
// Some(resource) while retained

yield* RcMap.has(
    map,
    "database"
)

Array.from(
    yield* RcMap.keys(
        map
    )
)`,
        apis: ["RcMap.getOption", "RcMap.has", "RcMap.keys"],
        notice: "A cached lookup failure is also shared: getOption on an existing failed/in-flight entry awaits that same result instead of starting a new lookup.",
    },

    Lifecycle: {
        eyebrow: "reference count reaches zero → idle policy",
        title: "Expire idle entries, extend their deadline with touch, or remove them explicitly with invalidate",
        description:
            "The default idle TTL is zero, so the last release removes and closes the entry immediately. Finite positive TTL keeps it cached until expiry; Infinity keeps it idle indefinitely. touch resets an existing non-zero TTL deadline. invalidate removes the key immediately from the map and closes it once no references remain.",
        code: `yield* Effect.scoped(
    RcMap.get(
        map,
        "session"
    )
)

// refCount → 0
// idle TTL starts

yield* RcMap.touch(
    map,
    "session"
)
// expiration reset

yield* RcMap.invalidate(
    map,
    "session"
)
// removed from map
// next get runs lookup again`,
        apis: ["RcMap.touch", "RcMap.invalidate", "RcMap.has", "RcMap.keys"],
        notice: "Invalidating an entry that is still borrowed removes its key immediately but does not revoke the existing resource. Its old scope closes when the remaining references are released.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    exports: string
    nested: string
    defaultCapacity: string
    defaultTtl: string
    boundedError: string
    state: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => ({
    mode: model.buildCase,
    exports: "9 top-level exports",
    nested: "State.Open · State.Closed · State.Entry",
    defaultCapacity: "no capacity → Infinity",
    defaultTtl: "no idleTimeToLive → Duration.zero",
    boundedError: "capacity present → E | Cause.ExceededCapacityError",
    state: "Open(map) → owning Scope close → Closed",
})

export type AcquireSnapshot = Readonly<{
    mode: AcquireCase
    first: string
    hit: string
    inFlight: string
    refs: string
    release: string
    closed: string
}>

export const acquire_snapshot = (model: Model): AcquireSnapshot => ({
    mode: model.acquireCase,
    first: "missing key → create Entry + run lookup in entry Scope",
    hit: "stored key → refCount++ · no second lookup",
    inFlight: "concurrent callers await one Deferred",
    refs: "one caller Scope finalizer per get",
    release: "last reference → apply idle TTL policy",
    closed: "get on Closed RcMap → interruption",
})

export type RetainSnapshot = Readonly<{
    mode: RetainCase
    missing: string
    cached: string
    failure: string
    has: string
    keys: string
    closed: string
}>

export const retain_snapshot = (model: Model): RetainSnapshot => ({
    mode: model.retainCase,
    missing: "getOption(missing) → None · no lookup · no capacity use",
    cached: "getOption(hit) → refCount++ · Some(value)",
    failure: "existing failure/in-flight entry → same result is shared",
    has: "has(key) → presence only · no retain",
    keys: "keys → iterable of currently stored keys",
    closed: "Closed: getOption None · has false · keys interrupts",
})

export type LifecycleSnapshot = Readonly<{
    mode: LifecycleCase
    zero: string
    finite: string
    infinite: string
    touch: string
    invalidate: string
    capacity: string
}>

export const lifecycle_snapshot = (model: Model): LifecycleSnapshot => ({
    mode: model.lifecycleCase,
    zero: "TTL 0 → last release removes + closes immediately",
    finite: "finite TTL → retain idle entry until deadline",
    infinite:
        "TTL Infinity → idle entry retained until invalidate / map shutdown",
    touch: "touch → expiresAt = now + entry TTL",
    invalidate: "remove key now · close immediately only when refCount = 0",
    capacity: "idle retained entries continue to occupy capacity",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRcMapStage: {
        stage: Stage,
    },
    SelectedRcMapBuildCase: {
        buildCase: BuildCase,
    },
    SelectedRcMapAcquireCase: {
        acquireCase: AcquireCase,
    },
    SelectedRcMapRetainCase: {
        retainCase: RetainCase,
    },
    SelectedRcMapLifecycleCase: {
        lifecycleCase: LifecycleCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    acquireCase: "Lazy",
    retainCase: "Option",
    lifecycleCase: "TTL",
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

type RetainCasePayload = Readonly<{
    retainCase: RetainCase
}>

type LifecycleCasePayload = Readonly<{
    lifecycleCase: LifecycleCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRcMapStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedRcMapBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedRcMapAcquireCase: ({ acquireCase }: AcquireCasePayload) => ({
            model: modifyFields(model, {
                acquireCase: () => acquireCase,
            }),
        }),

        SelectedRcMapRetainCase: ({ retainCase }: RetainCasePayload) => ({
            model: modifyFields(model, {
                retainCase: () => retainCase,
            }),
        }),

        SelectedRcMapLifecycleCase: ({
            lifecycleCase,
        }: LifecycleCasePayload) => ({
            model: modifyFields(model, {
                lifecycleCase: () => lifecycleCase,
            }),
        }),
    })
