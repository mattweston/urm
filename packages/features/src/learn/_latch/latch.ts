import { Effect, Fiber, Latch, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL EFFECT PROGRAMS
// -----------------------------------------------------------------------------

export const open_gate_program = Effect.gen(function* () {
    const latch = yield* Latch.make()

    const events: Array<string> = ["latch created: closed"]

    const waiter = yield* Effect.forkChild(
        Effect.gen(function* () {
            yield* latch.await

            events.push("waiter resumed")

            return "opened" as const
        })
    )

    events.push("waiter forked")

    const changed = yield* latch.open

    events.push(`open changed state: ${changed}`)

    const result = yield* Fiber.join(waiter)

    return {
        result,
        events,
        isOpen: latch.isOpen(),
    } as const
})

export const release_gate_program = Effect.gen(function* () {
    const latch = yield* Latch.make()

    const first = yield* Effect.forkChild(
        latch.await.pipe(Effect.as("first released"))
    )

    const released = yield* latch.release

    const firstResult = yield* Fiber.join(first)

    return {
        released,
        firstResult,
        stillOpen: latch.isOpen(),
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Gate"),
    S.Literal("Release"),
    S.Literal("Reuse"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Gate",
    "Release",
    "Reuse",
]

export const CreateCase = S.Union([
    S.Literal("Effectful"),
    S.Literal("Unsafe"),
    S.Literal("InitiallyOpen"),
])
export type CreateCase = typeof CreateCase.Type

export const GateCase = S.Union([
    S.Literal("Await"),
    S.Literal("WhenOpen"),
    S.Literal("AlreadyOpen"),
])
export type GateCase = typeof GateCase.Type

export const ReleaseCase = S.Union([
    S.Literal("Open"),
    S.Literal("Release"),
    S.Literal("Compare"),
])
export type ReleaseCase = typeof ReleaseCase.Type

export const ReuseCase = S.Union([
    S.Literal("Close"),
    S.Literal("Unsafe"),
    S.Literal("Transitions"),
])
export type ReuseCase = typeof ReuseCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    gateCase: GateCase,
    releaseCase: ReleaseCase,
    reuseCase: ReuseCase,
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
        eyebrow: "open or closed state",
        title: "Create a latch inside Effect or synchronously outside it",
        description:
            "Latch.make allocates inside Effect, while makeUnsafe returns a latch immediately. Both start closed by default; passing true creates an already-open latch that future await / whenOpen operations pass through immediately.",
        code: `const closed =
    yield* Latch.make()
// closed

const open =
    yield* Latch.make(
        true
    )
// open

const syncLatch =
    Latch.makeUnsafe()
// synchronous allocation

Latch.isOpen(
    syncLatch
)
// false`,
        apis: ["Latch.Latch", "Latch.make", "Latch.makeUnsafe", "Latch.isOpen"],
        notice: "Latch is reusable mutable coordination state. make is the normal Effect constructor; makeUnsafe is intended for synchronous allocation outside an Effect workflow.",
    },

    Gate: {
        eyebrow: "suspend until signaled",
        title: "await waits directly; whenOpen gates another Effect behind the same signal",
        description:
            "A closed latch suspends await and whenOpen. Opening or releasing the current waiter generation resumes them. If the latch is already open, both pass immediately.",
        code: `const latch =
    yield* Latch.make()

const waiter =
    yield* Effect.forkChild(
        Latch.await(
            latch
        ).pipe(
            Effect.as(
                "continued"
            )
        )
    )

const gated =
    Effect.succeed(
        "work ran"
    ).pipe(
        Latch.whenOpen(
            latch
        )
    )

yield* Latch.open(
    latch
)

yield* Fiber.join(
    waiter
)`,
        apis: ["Latch.await", "Latch.whenOpen", "Latch.open"],
        notice: "whenOpen preserves the supplied Effect's success, error, and requirements. It adds only the latch gate; it does not wrap or change the underlying Effect result type.",
    },

    Release: {
        eyebrow: "current vs future waiters",
        title: "open changes latch state; release only lets current waiters through",
        description:
            "open transitions a closed latch to open and releases waiters. release resumes the fibers currently waiting while the latch remains closed, so a later waiter suspends again until another signal.",
        code: `const latch =
    yield* Latch.make()

// closed waiter A suspends
const waiterA =
    yield* Effect.forkChild(
        latch.await
    )

yield* latch.release
// A resumes
// latch is STILL closed

latch.isOpen()
// false

// later waiter B will wait

yield* latch.open
// B and all future waiters pass`,
        apis: ["Latch.open", "Latch.release", "Latch.await", "Latch.isOpen"],
        notice: "Both open and release return boolean effects. open returns true only when it changed closed → open. release returns false when the latch is already open; on a closed latch it requests release of the current waiter generation without opening.",
    },

    Reuse: {
        eyebrow: "close and signal again",
        title: "Close an opened latch to reuse the gate for a later phase",
        description:
            "close transitions open → closed so later await / whenOpen calls suspend again. openUnsafe and closeUnsafe provide immediate synchronous state changes with the same boolean changed-state result.",
        code: `const latch =
    Latch.makeUnsafe(
        true
    )

Latch.isOpen(
    latch
)
// true

Latch.closeUnsafe(
    latch
)
// true

Latch.closeUnsafe(
    latch
)
// false

Latch.openUnsafe(
    latch
)
// true

Latch.isOpen(
    latch
)
// true`,
        apis: [
            "Latch.close",
            "Latch.closeUnsafe",
            "Latch.open",
            "Latch.openUnsafe",
            "Latch.isOpen",
        ],
        notice: "The boolean from open / close tells you whether that call actually changed state. Repeating the same transition returns false, which is useful when observing idempotent gate-state changes.",
    },
}

// -----------------------------------------------------------------------------
// CREATE SNAPSHOT
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    effectfulInitiallyOpen: boolean
    unsafeInitiallyOpen: boolean
    requestedOpen: boolean
    makeDescription: string
    unsafeDescription: string
}>

export const create_snapshot = (model: Model): CreateSnapshot => {
    const requestedOpen = model.createCase === "InitiallyOpen"

    const effectful = Effect.runSync(Latch.make(requestedOpen))

    const unsafe = Latch.makeUnsafe(requestedOpen)

    return {
        mode: model.createCase,
        effectfulInitiallyOpen: Latch.isOpen(effectful),
        unsafeInitiallyOpen: Latch.isOpen(unsafe),
        requestedOpen,
        makeDescription: "Effect<Latch>",
        unsafeDescription: "Latch immediately",
    }
}

// -----------------------------------------------------------------------------
// GATE SNAPSHOT
// -----------------------------------------------------------------------------

export type GateSnapshot = Readonly<{
    mode: GateCase
    initialState: string
    awaitType: string
    whenOpenType: string
    openChanged: boolean
    finalState: string
    alreadyOpenChanged: boolean
    exampleResult: string
}>

export const gate_snapshot = (model: Model): GateSnapshot => {
    const latch = Latch.makeUnsafe(model.gateCase === "AlreadyOpen")

    const initialState = Latch.isOpen(latch) ? "open" : "closed"

    const alreadyOpenChanged =
        model.gateCase === "AlreadyOpen" ? Latch.openUnsafe(latch) : false

    const openChanged =
        model.gateCase === "AlreadyOpen"
            ? alreadyOpenChanged
            : Latch.openUnsafe(latch)

    const gatedResult = Effect.runSync(
        Latch.whenOpen(latch, Effect.succeed("work ran"))
    )

    return {
        mode: model.gateCase,
        initialState,
        awaitType: "Effect<void>",
        whenOpenType: "Effect<A, E, R> → Effect<A, E, R>",
        openChanged,
        finalState: Latch.isOpen(latch) ? "open" : "closed",
        alreadyOpenChanged,
        exampleResult: gatedResult,
    }
}

// -----------------------------------------------------------------------------
// RELEASE SNAPSHOT
// -----------------------------------------------------------------------------

export type ReleaseSnapshot = Readonly<{
    mode: ReleaseCase
    openReturn: boolean
    openStateAfter: boolean
    releaseReturn: boolean
    releaseStateAfter: boolean
    secondOpenReturn: boolean
    difference: string
}>

export const release_snapshot = (model: Model): ReleaseSnapshot => {
    const openLatch = Latch.makeUnsafe(false)

    const openReturn = Effect.runSync(Latch.open(openLatch))

    const openStateAfter = Latch.isOpen(openLatch)

    const releaseLatch = Latch.makeUnsafe(false)

    const releaseReturn = Effect.runSync(Latch.release(releaseLatch))

    const releaseStateAfter = Latch.isOpen(releaseLatch)

    const secondOpenReturn = Effect.runSync(Latch.open(openLatch))

    return {
        mode: model.releaseCase,
        openReturn,
        openStateAfter,
        releaseReturn,
        releaseStateAfter,
        secondOpenReturn,
        difference:
            "open: current + future waiters · release: current waiters only",
    }
}

// -----------------------------------------------------------------------------
// REUSE SNAPSHOT
// -----------------------------------------------------------------------------

export type ReuseSnapshot = Readonly<{
    mode: ReuseCase
    initial: string
    close1: boolean
    close2: boolean
    stateAfterClose: string
    open1: boolean
    open2: boolean
    final: string
    effectfulClose: boolean
}>

export const reuse_snapshot = (model: Model): ReuseSnapshot => {
    const latch = Latch.makeUnsafe(true)

    const initial = Latch.isOpen(latch) ? "open" : "closed"

    const close1 = Latch.closeUnsafe(latch)

    const close2 = Latch.closeUnsafe(latch)

    const stateAfterClose = Latch.isOpen(latch) ? "open" : "closed"

    const open1 = Latch.openUnsafe(latch)

    const open2 = Latch.openUnsafe(latch)

    const effectfulLatch = Latch.makeUnsafe(true)

    const effectfulClose = Effect.runSync(Latch.close(effectfulLatch))

    return {
        mode: model.reuseCase,
        initial,
        close1,
        close2,
        stateAfterClose,
        open1,
        open2,
        final: Latch.isOpen(latch) ? "open" : "closed",
        effectfulClose,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedLatchStage: {
        stage: Stage,
    },
    SelectedLatchCreateCase: {
        createCase: CreateCase,
    },
    SelectedLatchGateCase: {
        gateCase: GateCase,
    },
    SelectedLatchReleaseCase: {
        releaseCase: ReleaseCase,
    },
    SelectedLatchReuseCase: {
        reuseCase: ReuseCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Effectful",
    gateCase: "Await",
    releaseCase: "Compare",
    reuseCase: "Transitions",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type GateCasePayload = Readonly<{
    gateCase: GateCase
}>

type ReleaseCasePayload = Readonly<{
    releaseCase: ReleaseCase
}>

type ReuseCasePayload = Readonly<{
    reuseCase: ReuseCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedLatchStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedLatchCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedLatchGateCase: ({ gateCase }: GateCasePayload) => ({
            model: evo(model, {
                gateCase: () => gateCase,
            }),
        }),

        SelectedLatchReleaseCase: ({ releaseCase }: ReleaseCasePayload) => ({
            model: evo(model, {
                releaseCase: () => releaseCase,
            }),
        }),

        SelectedLatchReuseCase: ({ reuseCase }: ReuseCasePayload) => ({
            model: evo(model, {
                reuseCase: () => reuseCase,
            }),
        }),
    })
