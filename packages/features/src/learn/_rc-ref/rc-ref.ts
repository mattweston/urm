import { Effect, RcRef, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL RCREF PROGRAMS
// -----------------------------------------------------------------------------

export type Resource = Readonly<{
    version: number
}>

let resource_sequence = 0

export const acquire_resource = Effect.acquireRelease(
    Effect.sync((): Resource => {
        resource_sequence += 1

        return {
            version: resource_sequence,
        }
    }),
    (_resource: Resource) => Effect.void
)

export const shared_resource_program = Effect.scoped(
    Effect.gen(function* () {
        const ref = yield* RcRef.make({
            acquire: acquire_resource,
        })

        const first = yield* RcRef.get(ref)

        const second = yield* RcRef.get(ref)

        return {
            sameObject: first === second,
            first,
            second,
        } as const
    })
)

export const reacquire_program = Effect.scoped(
    Effect.gen(function* () {
        const ref = yield* RcRef.make({
            acquire: acquire_resource,
        })

        const first = yield* Effect.scoped(RcRef.get(ref))

        const second = yield* Effect.scoped(RcRef.get(ref))

        return {
            first,
            second,
            reacquired: first.version !== second.version,
        } as const
    })
)

export const idle_reuse_program = Effect.scoped(
    Effect.gen(function* () {
        const ref = yield* RcRef.make({
            acquire: acquire_resource,
            idleTimeToLive: "1 minute",
        })

        const first = yield* Effect.scoped(RcRef.get(ref))

        const second = yield* Effect.scoped(RcRef.get(ref))

        return {
            first,
            second,
            reused: first.version === second.version,
        } as const
    })
)

export const invalidate_program = Effect.scoped(
    Effect.gen(function* () {
        const ref = yield* RcRef.make({
            acquire: acquire_resource,
            idleTimeToLive: "1 minute",
        })

        const first = yield* Effect.scoped(RcRef.get(ref))

        yield* RcRef.invalidate(ref)

        const second = yield* Effect.scoped(RcRef.get(ref))

        return {
            first,
            second,
            refreshed: first.version !== second.version,
        } as const
    })
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Borrow"),
    S.Literal("Idle"),
    S.Literal("Invalidate"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Borrow",
    "Idle",
    "Invalidate",
]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Lazy"),
    S.Literal("Scope"),
])
export type BuildCase = typeof BuildCase.Type

export const BorrowCase = S.Union([
    S.Literal("Get"),
    S.Literal("Share"),
    S.Literal("Release"),
])
export type BorrowCase = typeof BorrowCase.Type

export const IdleCase = S.Union([
    S.Literal("Zero"),
    S.Literal("Finite"),
    S.Literal("Reuse"),
])
export type IdleCase = typeof IdleCase.Type

export const InvalidateCase = S.Union([
    S.Literal("Refresh"),
    S.Literal("Active"),
    S.Literal("Next"),
])
export type InvalidateCase = typeof InvalidateCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    borrowCase: BorrowCase,
    idleCase: IdleCase,
    invalidateCase: InvalidateCase,
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
        eyebrow: "one lazily acquired reference-counted resource",
        title: "Create one RcRef inside an owning Scope",
        description:
            "RcRef.make stores an acquire Effect and captures the lifecycle needed to recreate the resource. It does not eagerly acquire the resource: acquisition begins when get first needs a value.",
        code: `const ref =
    yield* RcRef.make({
        acquire:
            Effect.acquireRelease(
                openConnection,
                closeConnection
            ),
        idleTimeToLive:
            "30 seconds"
    })

// no resource acquired yet`,
        apis: ["RcRef.RcRef", "RcRef.make"],
        notice: "make itself requires Scope because the RcRef owns any resource instances that it creates. Closing that owning Scope shuts the RcRef down and finalizes remaining resources.",
    },

    Borrow: {
        eyebrow: "each get belongs to the current caller Scope",
        title: "Borrow the current resource and share one acquisition across active users",
        description:
            "RcRef.get acquires lazily when necessary, increments the current reference count, and registers a finalizer in the caller's Scope. Multiple gets while the resource is retained reuse the same value.",
        code: `const first =
    yield* RcRef.get(ref)

const second =
    yield* RcRef.get(ref)

// first === second
// one acquisition
// two scoped references

// caller Scope closes
// references are released`,
        apis: ["RcRef.get"],
        notice: "The return type of get requires Scope. That requirement is the key safety property: every borrowed reference has a lifecycle boundary that can decrement the count automatically.",
    },

    Idle: {
        eyebrow: "last borrower leaves → idle policy decides what happens",
        title: "Release immediately by default, or keep the resource warm with idleTimeToLive",
        description:
            "With the default zero idle time, the final released reference closes the current resource. A positive idleTimeToLive keeps it available after the reference count reaches zero so a later get can reuse it.",
        code: `const ref =
    yield* RcRef.make({
        acquire:
            acquireConnection,
        idleTimeToLive:
            "1 minute"
    })

yield* Effect.scoped(
    RcRef.get(ref)
)

// refCount is now 0,
// but the resource remains warm

yield* Effect.scoped(
    RcRef.get(ref)
)
// reuses the warm resource`,
        apis: ["RcRef.make", "RcRef.get"],
        notice: "RcRef is a resource lifecycle primitive, not a mutable Ref. The cached value exists to avoid reacquisition churn between scoped users.",
    },

    Invalidate: {
        eyebrow: "discard the cached identity for future borrowers",
        title: "Invalidate so the next get acquires a fresh resource",
        description:
            "RcRef.invalidate marks the current cached resource as no longer reusable. The next get acquires a fresh resource. Active scopes that already borrowed the old resource are not revoked.",
        code: `const current =
    yield* RcRef.get(ref)

yield* RcRef.invalidate(
    ref
)

// current remains valid in
// this active borrowing Scope

const fresh =
    yield* RcRef.get(ref)

// future borrowing uses a
// newly acquired resource`,
        apis: ["RcRef.invalidate", "RcRef.get"],
        notice: "Invalidation separates old active users from future users: existing borrowers may finish with the old instance while later get calls move to a fresh instance.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    mode: string
    primary: string
    secondary: string
    lifecycle: string
    gotcha: string
}>

export const snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Build":
            return {
                mode: model.buildCase,
                primary: "make → lazy resource owner",
                secondary: "acquire Effect is stored until first get",
                lifecycle: "RcRef lifetime is bounded by its owning Scope",
                gotcha: "make does not itself borrow the resource",
            }

        case "Borrow":
            return {
                mode: model.borrowCase,
                primary: "get → Effect<A, E, Scope>",
                secondary: "active gets share one acquired value",
                lifecycle: "caller Scope close → reference count decrements",
                gotcha: "do not let the borrowed resource escape its Scope",
            }

        case "Idle":
            return {
                mode: model.idleCase,
                primary: "default TTL → immediate close after final release",
                secondary: "positive TTL → warm idle resource may be reused",
                lifecycle: "new borrow before expiry cancels reacquisition",
                gotcha: "idle caching is about resource lifetime, not mutable state",
            }

        case "Invalidate":
            return {
                mode: model.invalidateCase,
                primary: "invalidate → future get must refresh",
                secondary: "active old borrowers remain valid",
                lifecycle:
                    "old instance closes when its remaining references finish",
                gotcha: "invalidate is not forced revocation",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRcRefStage: {
        stage: Stage,
    },
    SelectedRcRefBuildCase: {
        buildCase: BuildCase,
    },
    SelectedRcRefBorrowCase: {
        borrowCase: BorrowCase,
    },
    SelectedRcRefIdleCase: {
        idleCase: IdleCase,
    },
    SelectedRcRefInvalidateCase: {
        invalidateCase: InvalidateCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    borrowCase: "Get",
    idleCase: "Zero",
    invalidateCase: "Refresh",
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

type IdleCasePayload = Readonly<{
    idleCase: IdleCase
}>

type InvalidateCasePayload = Readonly<{
    invalidateCase: InvalidateCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRcRefStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedRcRefBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedRcRefBorrowCase: ({ borrowCase }: BorrowCasePayload) => ({
            model: modifyFields(model, {
                borrowCase: () => borrowCase,
            }),
        }),

        SelectedRcRefIdleCase: ({ idleCase }: IdleCasePayload) => ({
            model: modifyFields(model, {
                idleCase: () => idleCase,
            }),
        }),

        SelectedRcRefInvalidateCase: ({
            invalidateCase,
        }: InvalidateCasePayload) => ({
            model: modifyFields(model, {
                invalidateCase: () => invalidateCase,
            }),
        }),
    })
