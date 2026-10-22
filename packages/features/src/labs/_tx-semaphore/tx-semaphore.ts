import { Effect, Schema as S, TxRef, TxSemaphore } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXSEMAPHORE PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(3)
    return {
        capacity: yield* TxSemaphore.capacity(semaphore),
        available: yield* TxSemaphore.available(semaphore),
    }
})

export const manual_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(5)
    yield* TxSemaphore.acquireN(semaphore, 3)
    const afterAcquire = yield* TxSemaphore.available(semaphore)
    yield* TxSemaphore.releaseN(semaphore, 2)
    const afterRelease = yield* TxSemaphore.available(semaphore)
    return [afterAcquire, afterRelease] as const
})

export const try_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(1)
    const first = yield* TxSemaphore.tryAcquire(semaphore)
    const second = yield* TxSemaphore.tryAcquire(semaphore)
    return [first, second] as const
})

export const atomic_reservation_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(2)
    const reservations = yield* TxRef.make(0)

    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxSemaphore.acquire(semaphore)
            yield* TxRef.update(reservations, (count: number) => count + 1)
        })
    )

    return {
        available: yield* TxSemaphore.available(semaphore),
        reservations: yield* TxRef.get(reservations),
    }
})

export const capped_release_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(2)
    yield* TxSemaphore.release(semaphore)
    yield* TxSemaphore.releaseN(semaphore, 10)
    return yield* TxSemaphore.available(semaphore)
})

export const with_permit_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(2)
    const during = yield* TxSemaphore.withPermit(
        semaphore,
        TxSemaphore.available(semaphore)
    )
    const after = yield* TxSemaphore.available(semaphore)
    return [during, after] as const
})

export const scoped_program = Effect.gen(function* () {
    const semaphore = yield* TxSemaphore.make(2)
    const during = yield* Effect.scoped(
        Effect.gen(function* () {
            yield* TxSemaphore.withPermitScoped(semaphore)
            return yield* TxSemaphore.available(semaphore)
        })
    )
    const after = yield* TxSemaphore.available(semaphore)
    return [during, after] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Acquire"),
    S.Literal("Release"),
    S.Literal("Scope"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Acquire",
    "Release",
    "Scope",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Inspect"),
    S.Literal("Guard"),
    S.Literal("Zero"),
])
export type CreateCase = typeof CreateCase.Type
export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Inspect",
    "Guard",
    "Zero",
]

export const AcquireCase = S.Union([
    S.Literal("One"),
    S.Literal("Many"),
    S.Literal("Try"),
    S.Literal("Atomic"),
])
export type AcquireCase = typeof AcquireCase.Type
export const acquire_cases: ReadonlyArray<AcquireCase> = [
    "One",
    "Many",
    "Try",
    "Atomic",
]

export const ReleaseCase = S.Union([
    S.Literal("One"),
    S.Literal("Many"),
    S.Literal("Cap"),
    S.Literal("Invalid"),
])
export type ReleaseCase = typeof ReleaseCase.Type
export const release_cases: ReadonlyArray<ReleaseCase> = [
    "One",
    "Many",
    "Cap",
    "Invalid",
]

export const ScopeCase = S.Union([
    S.Literal("Permit"),
    S.Literal("Permits"),
    S.Literal("Scoped"),
    S.Literal("AutoRelease"),
])
export type ScopeCase = typeof ScopeCase.Type
export const scope_cases: ReadonlyArray<ScopeCase> = [
    "Permit",
    "Permits",
    "Scoped",
    "AutoRelease",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    acquireCase: AcquireCase,
    releaseCase: ReleaseCase,
    scopeCase: ScopeCase,
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
    Create: {
        eyebrow: "Fixed capacity + transactional available-count state",
        title: "Create and inspect a transactional semaphore",
        description:
            "make stores the current permit count in a TxRef and keeps the original capacity fixed. available changes as permits move; capacity does not.",
        code: `const semaphore = yield* TxSemaphore.make(3)

const state = {
    capacity: yield* TxSemaphore.capacity(semaphore),
    available: yield* TxSemaphore.available(semaphore)
}
// { capacity: 3, available: 3 }`,
        apis: ["TxSemaphore.make", "capacity", "available", "isTxSemaphore"],
        notice: "A TxSemaphore is runtime coordination state. Keep the live semaphore and its TxRef out of the serializable Foldkit model.",
    },
    Acquire: {
        eyebrow:
            "Blocking acquisition retries; try-acquisition returns immediately",
        title: "Acquire transactional permits",
        description:
            "acquire and acquireN retry the transaction until enough permits are available. tryAcquire and tryAcquireN instead return false without waiting or changing the count.",
        code: `yield* TxSemaphore.acquireN(semaphore, 2)

const acquired = yield* TxSemaphore.tryAcquire(semaphore)
// false when no permit is available

// acquire can compose atomically with TxRef changes
yield* Effect.tx(program)`,
        apis: ["acquire", "acquireN", "tryAcquire", "tryAcquireN"],
        notice: "acquireN requires the full requested count at once. Asking for more permits than fixed capacity can therefore wait forever.",
    },
    Release: {
        eyebrow:
            "Release makes permits available but never exceeds fixed capacity",
        title: "Return permits safely",
        description:
            "release returns one permit; releaseN returns several. Both cap the resulting available count at capacity, so extra releases never grow the semaphore beyond its configured total.",
        code: `yield* TxSemaphore.release(semaphore)
yield* TxSemaphore.releaseN(semaphore, 2)

const remaining = yield* TxSemaphore.available(semaphore)`,
        apis: ["release", "releaseN", "available", "capacity"],
        notice: "releaseN rejects non-positive counts with a defect. Manual acquire/release pairs must still be structured carefully so exceptional exits do not leak permits.",
    },
    Scope: {
        eyebrow:
            "Acquire/use/release helpers make permit lifetimes exception-safe",
        title: "Bracket work with permits",
        description:
            "withPermit and withPermits acquire before running the effect and release after success, failure, or interruption. withPermitScoped holds one permit until the current Scope closes.",
        code: `const result = yield* TxSemaphore.withPermits(
    semaphore,
    2,
    effect
)

// one permit for the lifetime of a Scope
yield* TxSemaphore.withPermitScoped(semaphore)`,
        apis: ["withPermit", "withPermits", "withPermitScoped"],
        notice: "Prefer bracketed helpers for ordinary resource limits. They encode release on exceptional exits instead of relying on hand-written cleanup.",
    },
}

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const create_snapshot = (model: Model): Snapshot => {
    switch (model.createCase) {
        case "Make":
            return {
                input: "initial permits = 3",
                operation: "TxSemaphore.make(3)",
                result: "capacity 3 · available 3",
                invariant: "available starts at capacity",
                implementation: "TxRef.make(permits) + fixed capacity field",
                guidance:
                    "Use one semaphore for the resource pool or concurrency budget you need to account for transactionally.",
            }
        case "Inspect":
            return {
                input: "live semaphore",
                operation: "capacity / available",
                result: "fixed total · current free count",
                invariant: "capacity never changes",
                implementation: "capacity field + TxRef.get(permitsRef)",
                guidance:
                    "Use available for operational state and capacity for the configured upper bound.",
            }
        case "Guard":
            return {
                input: "unknown value",
                operation: "isTxSemaphore(value)",
                result: "type guard boolean",
                invariant: "uses exported runtime identity",
                implementation: "private TypeId marker",
                guidance:
                    "Use the public guard rather than depending on the marker string.",
            }
        case "Zero":
            return {
                input: "initial permits = 0",
                operation: "TxSemaphore.make(0)",
                result: "valid zero-capacity semaphore",
                invariant: "acquire waits; tryAcquire returns false",
                implementation: "negative only is rejected",
                guidance:
                    "Zero capacity is legal, but useful only when a later protocol can never require acquisition or the value is replaced externally.",
            }
    }
}

export const acquire_snapshot = (model: Model): Snapshot => {
    switch (model.acquireCase) {
        case "One":
            return {
                input: "available > 0",
                operation: "acquire(semaphore)",
                result: "available - 1",
                invariant: "retries when available is 0",
                implementation: "TxRef.get → txRetry or TxRef.set",
                guidance:
                    "Use manual acquisition when permit ownership must be coordinated with other transactional state.",
            }
        case "Many":
            return {
                input: "n positive permits",
                operation: "acquireN(semaphore, n)",
                result: "available - n",
                invariant: "all n are acquired atomically",
                implementation: "retry unless available >= n",
                guidance:
                    "Never request more than capacity unless indefinite waiting is explicitly intended.",
            }
        case "Try":
            return {
                input: "current available count",
                operation: "tryAcquire / tryAcquireN",
                result: "boolean success",
                invariant: "failure does not wait or decrement",
                implementation: "TxRef.modify",
                guidance:
                    "Use try-acquire for optional work or fallback paths that must not suspend on permit scarcity.",
            }
        case "Atomic":
            return {
                input: "semaphore + related TxRef state",
                operation: "Effect.tx(acquire + TxRef.update)",
                result: "one atomic reservation",
                invariant: "permit and related state commit together",
                implementation: "shared transaction journal",
                guidance:
                    "This atomic composition is the main reason to use TxSemaphore instead of a standalone non-transactional semaphore.",
            }
    }
}

export const release_snapshot = (model: Model): Snapshot => {
    switch (model.releaseCase) {
        case "One":
            return {
                input: "available below capacity",
                operation: "release(semaphore)",
                result: "available + 1",
                invariant: "result is capped at capacity",
                implementation: "TxRef.update",
                guidance:
                    "Match each manual single-permit acquisition with one release.",
            }
        case "Many":
            return {
                input: "n positive permits",
                operation: "releaseN(semaphore, n)",
                result: "min(capacity, available + n)",
                invariant: "bulk return is one transactional update",
                implementation: "TxRef.update + capacity clamp",
                guidance: "Use when a batch acquisition is returned together.",
            }
        case "Cap":
            return {
                input: "semaphore already full",
                operation: "release / releaseN",
                result: "available unchanged at capacity",
                invariant: "over-release cannot inflate capacity",
                implementation: "capacity clamp",
                guidance:
                    "The cap prevents permit inflation, but it does not detect mismatched ownership; structure acquisition/release lifetimes correctly.",
            }
        case "Invalid":
            return {
                input: "n <= 0",
                operation: "acquireN / tryAcquireN / releaseN",
                result: "defect",
                invariant: "multi-permit count must be positive",
                implementation: "Effect.die(Error(...))",
                guidance:
                    "Validate user-derived counts before passing them to the multi-permit APIs.",
            }
    }
}

export const scope_snapshot = (model: Model): Snapshot => {
    switch (model.scopeCase) {
        case "Permit":
            return {
                input: "semaphore + Effect<A, E, R>",
                operation: "withPermit(semaphore, effect)",
                result: "same effect result",
                invariant: "one permit is released after use",
                implementation: "Effect.acquireUseRelease",
                guidance:
                    "Use for a single effectful critical section that consumes one permit.",
            }
        case "Permits":
            return {
                input: "semaphore + n + effect",
                operation: "withPermits(semaphore, n, effect)",
                result: "same effect result",
                invariant: "all n permits share one bracket",
                implementation: "acquireN/use/releaseN",
                guidance:
                    "Use when one operation consumes several units from the same fixed budget.",
            }
        case "Scoped":
            return {
                input: "Scope + semaphore",
                operation: "withPermitScoped(semaphore)",
                result: "permit held until scope close",
                invariant: "scope finalizer releases one permit",
                implementation: "Effect.acquireRelease",
                guidance:
                    "Use when multiple effects in one Scope should share the same held permit.",
            }
        case "AutoRelease":
            return {
                input: "success, failure, or interruption",
                operation: "withPermit(s) finalizer",
                result: "permits restored",
                invariant: "release runs after the protected effect exits",
                implementation: "acquire/use/release bracket",
                guidance:
                    "Prefer automatic bracketing whenever possible so exceptional exits cannot leak a manually acquired permit.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Acquire":
            return acquire_snapshot(model)
        case "Release":
            return release_snapshot(model)
        case "Scope":
            return scope_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    acquireCase: "One",
    releaseCase: "One",
    scopeCase: "Permit",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxSemaphoreStage: { stage: Stage },
    SelectedTxSemaphoreCreateCase: { createCase: CreateCase },
    SelectedTxSemaphoreAcquireCase: { acquireCase: AcquireCase },
    SelectedTxSemaphoreReleaseCase: { releaseCase: ReleaseCase },
    SelectedTxSemaphoreScopeCase: { scopeCase: ScopeCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type AcquireCasePayload = Readonly<{ acquireCase: AcquireCase }>
type ReleaseCasePayload = Readonly<{ releaseCase: ReleaseCase }>
type ScopeCasePayload = Readonly<{ scopeCase: ScopeCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxSemaphoreStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxSemaphoreCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxSemaphoreAcquireCase: ({
            acquireCase,
        }: AcquireCasePayload) => ({
            model: modifyFields(model, { acquireCase: () => acquireCase }),
        }),
        SelectedTxSemaphoreReleaseCase: ({
            releaseCase,
        }: ReleaseCasePayload) => ({
            model: modifyFields(model, { releaseCase: () => releaseCase }),
        }),
        SelectedTxSemaphoreScopeCase: ({ scopeCase }: ScopeCasePayload) => ({
            model: modifyFields(model, { scopeCase: () => scopeCase }),
        }),
    })
