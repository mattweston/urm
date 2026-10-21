import { Deferred, Effect, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Wait"),
    S.Literal("Complete"),
    S.Literal("Outcomes"),
    S.Literal("Memoize"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Wait",
    "Complete",
    "Outcomes",
    "Memoize",
]

export const WaitStep = S.Union([
    S.Literal("Empty"),
    S.Literal("Waiting"),
    S.Literal("Resolved"),
])
export type WaitStep = typeof WaitStep.Type

export const CompletionOrder = S.Union([
    S.Literal("AFirst"),
    S.Literal("BFirst"),
])
export type CompletionOrder = typeof CompletionOrder.Type

export const Outcome = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Defect"),
    S.Literal("Interrupt"),
])
export type Outcome = typeof Outcome.Type

export const MemoMode = S.Union([
    S.Literal("Complete"),
    S.Literal("CompleteWith"),
])
export type MemoMode = typeof MemoMode.Type

export const Model = S.Struct({
    stage: Stage,
    waitStep: WaitStep,
    completionOrder: CompletionOrder,
    outcome: Outcome,
    memoMode: MemoMode,
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
    Wait: {
        eyebrow: "one-time coordination",
        title: "Await suspends fibers until one result exists",
        description:
            "A Deferred starts empty. Any number of fibers can await it without blocking an operating-system thread, then every waiter resumes with the same completion.",
        code: `const gate = yield* Deferred.make<string>()

const consumerA = yield* Effect.forkChild(
    Deferred.await(gate)
)

const consumerB = yield* Effect.forkChild(
    Deferred.await(gate)
)

yield* Deferred.succeed(gate, "ready")

yield* Fiber.join(consumerA) // "ready"
yield* Fiber.join(consumerB) // "ready"`,
        apis: [
            "Deferred.make",
            "Deferred.await",
            "Deferred.succeed",
            "Deferred.isDone",
            "Deferred.poll",
            "Deferred.isDeferred",
        ],
        notice: "Deferred.await suspends the Effect fiber, not an operating-system thread. Completion wakes every registered waiter and future awaiters observe the same result immediately.",
    },
    Complete: {
        eyebrow: "exactly once",
        title: "The first completion wins",
        description:
            "Every completion API returns a boolean. The call that fills the Deferred gets true; every later attempt gets false and cannot replace the stored result.",
        code: `const gate = yield* Deferred.make<string>()

const first = yield* Deferred.succeed(
    gate,
    "producer A"
)

const second = yield* Deferred.succeed(
    gate,
    "producer B"
)

const value = yield* Deferred.await(gate)

// first  === true
// second === false
// value  === "producer A"`,
        apis: [
            "Deferred.succeed",
            "Deferred.sync",
            "Deferred.done",
            "Deferred.doneUnsafe",
            "Deferred.isDone",
            "Deferred.isDoneUnsafe",
        ],
        notice: "A Deferred is a one-shot cell, not a mutable Ref. The boolean result makes races explicit: one producer wins and all other completion attempts become no-ops.",
    },
    Outcomes: {
        eyebrow: "full Effect result",
        title: "Completion can carry success, failure, defect, or interruption",
        description:
            "Await does not just retrieve A. A Deferred stores an Effect result, so typed failures, defects, and interruption resume waiters through the same channels.",
        code: `const gate =
    yield* Deferred.make<number, string>()

yield* Deferred.succeed(gate, 42)
// await → succeeds with 42

yield* Deferred.fail(gate, "not ready")
// await → fails with "not ready"

yield* Deferred.die(gate, new Error("boom"))
// await → dies with the defect

yield* Deferred.interrupt(gate)
// await → interrupted`,
        apis: [
            "Deferred.fail",
            "Deferred.failSync",
            "Deferred.failCause",
            "Deferred.die",
            "Deferred.dieSync",
            "Deferred.interrupt",
            "Deferred.interruptWith",
            "Deferred.into",
        ],
        notice: "Only the first completion is used in a real Deferred. The four examples here are independent cells so each result channel can be inspected separately.",
    },
    Memoize: {
        eyebrow: "completion semantics",
        title: "complete memoizes; completeWith stores the Effect directly",
        description:
            "Both accept an Effect, but they deliberately differ. complete runs it once and stores its result; completeWith stores the Effect so each awaiter may execute it independently.",
        code: `let evaluations = 0

const source = Effect.sync(() => {
    evaluations += 1
    return evaluations
})

yield* Deferred.complete(gate, source)
// source runs now; result is memoized

yield* Deferred.completeWith(gate, source)
// source itself is stored; each await may run it`,
        apis: [
            "Deferred.complete",
            "Deferred.completeWith",
            "Deferred.await",
            "Deferred.into",
        ],
        notice: "Use complete when many consumers must share one evaluation. completeWith is lower-level: it stores an environment-free Effect directly and does not memoize that Effect for you.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type WaitSnapshot = Readonly<{
    state: string
    isDeferred: boolean
    isDone: boolean
    poll: "None" | "Some(effect)"
    waiterCount: number
    consumerA: string
    consumerB: string
    completion: string
}>

export const wait_snapshot = (model: Model): WaitSnapshot => {
    const gate = Deferred.makeUnsafe<string>()

    if (model.waitStep === "Resolved") {
        Effect.runSync(Deferred.succeed(gate, "ready"))
    }

    const polled = Effect.runSync(Deferred.poll(gate))

    if (model.waitStep === "Empty") {
        return {
            state: "empty",
            isDeferred: Deferred.isDeferred(gate),
            isDone: Deferred.isDoneUnsafe(gate),
            poll: Option.isSome(polled) ? "Some(effect)" : "None",
            waiterCount: 0,
            consumerA: "not started",
            consumerB: "not started",
            completion: "—",
        }
    }

    if (model.waitStep === "Waiting") {
        return {
            state: "awaiting completion",
            isDeferred: Deferred.isDeferred(gate),
            isDone: Deferred.isDoneUnsafe(gate),
            poll: Option.isSome(polled) ? "Some(effect)" : "None",
            waiterCount: 2,
            consumerA: "suspended on Deferred.await",
            consumerB: "suspended on Deferred.await",
            completion: "—",
        }
    }

    return {
        state: "completed",
        isDeferred: Deferred.isDeferred(gate),
        isDone: Deferred.isDoneUnsafe(gate),
        poll: Option.isSome(polled) ? "Some(effect)" : "None",
        waiterCount: 2,
        consumerA: "resumed → ready",
        consumerB: "resumed → ready",
        completion: "ready",
    }
}

export type CompleteSnapshot = Readonly<{
    firstProducer: string
    firstAttempt: boolean
    secondProducer: string
    secondAttempt: boolean
    storedValue: string
    isDone: boolean
}>

export const complete_snapshot = (model: Model): CompleteSnapshot => {
    const gate = Deferred.makeUnsafe<string>()

    const firstProducer =
        model.completionOrder === "AFirst" ? "producer A" : "producer B"

    const secondProducer =
        model.completionOrder === "AFirst" ? "producer B" : "producer A"

    const firstAttempt = Effect.runSync(Deferred.succeed(gate, firstProducer))

    const secondAttempt = Effect.runSync(Deferred.succeed(gate, secondProducer))

    const storedValue = Effect.runSync(Deferred.await(gate))

    return {
        firstProducer,
        firstAttempt,
        secondProducer,
        secondAttempt,
        storedValue,
        isDone: Deferred.isDoneUnsafe(gate),
    }
}

export type OutcomeSnapshot = Readonly<{
    api: string
    completionWon: boolean
    isDone: boolean
    awaitChannel: string
    awaitValue: string
    errorType: string
}>

export const outcome_snapshot = (model: Model): OutcomeSnapshot => {
    if (model.outcome === "Success") {
        const gate = Deferred.makeUnsafe<number, string>()

        const completionWon = Effect.runSync(Deferred.succeed(gate, 42))

        return {
            api: "Deferred.succeed",
            completionWon,
            isDone: Deferred.isDoneUnsafe(gate),
            awaitChannel: "success",
            awaitValue: "42",
            errorType: "never",
        }
    }

    if (model.outcome === "Failure") {
        const gate = Deferred.makeUnsafe<number, string>()

        const completionWon = Effect.runSync(Deferred.fail(gate, "not ready"))

        return {
            api: "Deferred.fail",
            completionWon,
            isDone: Deferred.isDoneUnsafe(gate),
            awaitChannel: "typed failure",
            awaitValue: '"not ready"',
            errorType: "string",
        }
    }

    if (model.outcome === "Defect") {
        const gate = Deferred.makeUnsafe<number, string>()

        const completionWon = Effect.runSync(
            Deferred.die(gate, new Error("boom"))
        )

        return {
            api: "Deferred.die",
            completionWon,
            isDone: Deferred.isDoneUnsafe(gate),
            awaitChannel: "defect",
            awaitValue: 'Error("boom")',
            errorType: "not in E",
        }
    }

    const gate = Deferred.makeUnsafe<number, string>()

    const completionWon = Effect.runSync(Deferred.interruptWith(gate, 42))

    return {
        api: "Deferred.interruptWith",
        completionWon,
        isDone: Deferred.isDoneUnsafe(gate),
        awaitChannel: "interruption",
        awaitValue: "FiberId 42",
        errorType: "not in E",
    }
}

export type MemoSnapshot = Readonly<{
    mode: MemoMode
    completionWon: boolean
    evaluationsAfterCompletion: number
    firstAwait: number
    evaluationsAfterFirstAwait: number
    secondAwait: number
    evaluationsAfterSecondAwait: number
}>

export const memo_snapshot = (model: Model): MemoSnapshot => {
    const gate = Deferred.makeUnsafe<number>()

    let evaluations = 0

    const source = Effect.sync(() => {
        evaluations += 1
        return evaluations
    })

    const completionWon =
        model.memoMode === "Complete"
            ? Effect.runSync(Deferred.complete(gate, source))
            : Effect.runSync(Deferred.completeWith(gate, source))

    const evaluationsAfterCompletion = evaluations

    const firstAwait = Effect.runSync(Deferred.await(gate))

    const evaluationsAfterFirstAwait = evaluations

    const secondAwait = Effect.runSync(Deferred.await(gate))

    const evaluationsAfterSecondAwait = evaluations

    return {
        mode: model.memoMode,
        completionWon,
        evaluationsAfterCompletion,
        firstAwait,
        evaluationsAfterFirstAwait,
        secondAwait,
        evaluationsAfterSecondAwait,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedDeferredStage: {
        stage: Stage,
    },
    SelectedDeferredWaitStep: {
        waitStep: WaitStep,
    },
    SelectedDeferredCompletionOrder: {
        completionOrder: CompletionOrder,
    },
    SelectedDeferredOutcome: {
        outcome: Outcome,
    },
    SelectedDeferredMemoMode: {
        memoMode: MemoMode,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Wait",
    waitStep: "Waiting",
    completionOrder: "AFirst",
    outcome: "Success",
    memoMode: "Complete",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedDeferredStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),
        SelectedDeferredWaitStep: ({ waitStep }) => ({
            model: evo(model, {
                waitStep: () => waitStep,
            }),
        }),
        SelectedDeferredCompletionOrder: ({ completionOrder }) => ({
            model: evo(model, {
                completionOrder: () => completionOrder,
            }),
        }),
        SelectedDeferredOutcome: ({ outcome }) => ({
            model: evo(model, {
                outcome: () => outcome,
            }),
        }),
        SelectedDeferredMemoMode: ({ memoMode }) => ({
            model: evo(model, {
                memoMode: () => memoMode,
            }),
        }),
    })
