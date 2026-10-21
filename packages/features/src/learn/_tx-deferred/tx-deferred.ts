import {
    Effect,
    Exit,
    Option,
    Result,
    Schema as S,
    TxDeferred,
    TxRef,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXDEFERRED PROGRAMS
// -----------------------------------------------------------------------------

export const make_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    return yield* TxDeferred.poll(deferred)
})

export const succeed_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    const first = yield* TxDeferred.succeed(deferred, 42)
    const second = yield* TxDeferred.succeed(deferred, 99)
    const value = yield* TxDeferred.await(deferred)
    return [first, second, value] as const
})

export const fail_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    const first = yield* TxDeferred.fail(deferred, "boom")
    const second = yield* TxDeferred.fail(deferred, "ignored")
    const exit = yield* Effect.exit(TxDeferred.await(deferred))
    return [first, second, exit] as const
})

export const done_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    const first = yield* TxDeferred.done(deferred, Result.succeed(42))
    const second = yield* TxDeferred.done(deferred, Result.fail("too late"))
    return [first, second, yield* TxDeferred.poll(deferred)] as const
})

export const poll_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    const before = yield* TxDeferred.poll(deferred)
    yield* TxDeferred.succeed(deferred, 42)
    const after = yield* TxDeferred.poll(deferred)
    return [before, after] as const
})

export const atomic_program = Effect.gen(function* () {
    const deferred = yield* TxDeferred.make<number, string>()
    const version = yield* TxRef.make(0)

    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxRef.set(version, 1)
            yield* TxDeferred.succeed(deferred, 42)
        })
    )

    return [
        yield* TxRef.get(version),
        yield* TxDeferred.poll(deferred),
    ] as const
})

export const successful_exit = Exit.succeed(42)
export const empty_poll = Option.none<Result.Result<number, string>>()

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Wait"),
    S.Literal("Complete"),
    S.Literal("Inspect"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Wait",
    "Complete",
    "Inspect",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("TypedError"),
    S.Literal("Guard"),
    S.Literal("Backing"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Empty",
    "TypedError",
    "Guard",
    "Backing",
]

export const WaitCase = S.Union([
    S.Literal("Await"),
    S.Literal("Retry"),
    S.Literal("Success"),
    S.Literal("Failure"),
])
export type WaitCase = typeof WaitCase.Type

export const wait_cases: ReadonlyArray<WaitCase> = [
    "Await",
    "Retry",
    "Success",
    "Failure",
]

export const CompleteCase = S.Union([
    S.Literal("Succeed"),
    S.Literal("Fail"),
    S.Literal("Done"),
    S.Literal("FirstWins"),
])
export type CompleteCase = typeof CompleteCase.Type

export const complete_cases: ReadonlyArray<CompleteCase> = [
    "Succeed",
    "Fail",
    "Done",
    "FirstWins",
]

export const InspectCase = S.Union([
    S.Literal("PollEmpty"),
    S.Literal("PollSuccess"),
    S.Literal("PollFailure"),
    S.Literal("Transaction"),
])
export type InspectCase = typeof InspectCase.Type

export const inspect_cases: ReadonlyArray<InspectCase> = [
    "PollEmpty",
    "PollSuccess",
    "PollFailure",
    "Transaction",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    waitCase: WaitCase,
    completeCase: CompleteCase,
    inspectCase: InspectCase,
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
        eyebrow: "write-once result stored in transactional state",
        title: "Create an empty transactional deferred",
        description:
            "TxDeferred.make creates a TxRef whose value starts as Option.none. Completion later stores exactly one Result<A, E>; the cell itself is runtime transactional state, not serializable application data.",
        code: `const deferred = yield* TxDeferred.make<number, string>()

const state = yield* TxDeferred.poll(deferred)
// Option.none()`,
        apis: ["TxDeferred.make", "TxDeferred.poll", "TxDeferred.isTxDeferred"],
        notice: "The public model exposes the backing TxRef, but application code should normally coordinate through TxDeferred operations rather than mutating that ref directly.",
    },

    Wait: {
        eyebrow: "await means retry the transaction while the cell is empty",
        title: "Wait transactionally for completion",
        description:
            "TxDeferred.await reads the backing TxRef inside Effect.tx. If the cell is empty it executes Effect.txRetry; after completion it either returns the success value or fails with the stored typed error.",
        code: `const value = yield* TxDeferred.await(deferred)

// empty  -> txRetry
// success -> return value
// failure -> Effect.fail(error)`,
        apis: [
            "TxDeferred.await",
            "Effect.txRetry",
            "Effect.tx",
            "Result.isSuccess",
        ],
        notice: "This is transactional waiting, not busy polling. The transaction retries only after relevant transactional state changes.",
    },

    Complete: {
        eyebrow: "completion is one-shot and reports whether it won",
        title: "Complete once with success, failure, or Result",
        description:
            "succeed and fail are convenience wrappers over done. All three attempt one atomic TxRef modification and return true only for the first completion; later attempts return false without replacing the stored Result.",
        code: `const first = yield* TxDeferred.succeed(
    deferred,
    42
)

const second = yield* TxDeferred.fail(
    deferred,
    "too late"
)
// [true, false]`,
        apis: [
            "TxDeferred.succeed",
            "TxDeferred.fail",
            "TxDeferred.done",
            "Result.succeed",
        ],
        notice: "The boolean result matters when multiple transactional writers may race to complete the same deferred.",
    },

    Inspect: {
        eyebrow: "poll inspects without retrying",
        title: "Inspect state or compose completion with other TxRef updates",
        description:
            "poll returns Option.none while empty and Option.some(Result) after completion. Because the backing state is transactional, a completion can be committed atomically with other TxRef changes inside one Effect.tx block.",
        code: `yield* Effect.tx(
    Effect.gen(function*() {
        yield* TxRef.set(version, 1)
        yield* TxDeferred.succeed(deferred, 42)
    })
)`,
        apis: ["TxDeferred.poll", "Option", "Result", "Effect.tx", "TxRef.set"],
        notice: "Use poll for observation without waiting; use await when the transaction should suspend until completion becomes available.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

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
        case "Empty":
            return {
                input: "type parameters A = number, E = string",
                operation: "TxDeferred.make<number, string>()",
                result: "empty TxDeferred<number, string>",
                invariant: "completion slot starts empty",
                implementation: "TxRef.make(Option.none())",
                guidance:
                    "Create the cell before the transaction-local producer and consumer need to coordinate.",
            }
        case "TypedError":
            return {
                input: "A success type + E failure type",
                operation: "TxDeferred.make<A, E>()",
                result: "write-once Result<A, E> slot",
                invariant: "typed failure is part of the deferred contract",
                implementation: "Option<Result<A, E>> inside TxRef",
                guidance:
                    "Use a meaningful E when completion can fail and callers should handle that failure explicitly.",
            }
        case "Guard":
            return {
                input: "unknown value",
                operation: "TxDeferred.isTxDeferred(value)",
                result: "boolean + type narrowing",
                invariant: "guard checks the runtime marker",
                implementation: "Predicate.hasProperty(TypeId)",
                guidance:
                    "Use the exported guard instead of depending on the private TypeId string.",
            }
        case "Backing":
            return {
                input: "TxDeferred<A, E>",
                operation: "deferred.ref",
                result: "TxRef<Option<Result<A, E>>>",
                invariant: "transactional state is one optional Result",
                implementation: "public backing ref on the model",
                guidance:
                    "Treat ref as an implementation detail unless building lower-level transactional abstractions.",
            }
    }
}

export const wait_snapshot = (model: Model): Snapshot => {
    switch (model.waitCase) {
        case "Await":
            return {
                input: "possibly-empty TxDeferred",
                operation: "TxDeferred.await(deferred)",
                result: "Effect<A, E>",
                invariant:
                    "does not return until a committed completion exists",
                implementation: "TxRef.get + txRetry inside Effect.tx",
                guidance:
                    "Use await when the consumer should transactionally wait for the producer.",
            }
        case "Retry":
            return {
                input: "Option.none() backing state",
                operation: "Effect.txRetry",
                result: "transaction suspended for relevant changes",
                invariant: "no busy loop",
                implementation: "retry is triggered by the empty branch",
                guidance:
                    "A completion of the accessed TxRef can make the waiting transaction runnable again.",
            }
        case "Success":
            return {
                input: "Option.some(Result.succeed(42))",
                operation: "TxDeferred.await(deferred)",
                result: "42",
                invariant:
                    "success is returned through the Effect success channel",
                implementation: "Result.isSuccess -> result.success",
                guidance:
                    "Await unwraps the Result for the caller; poll does not.",
            }
        case "Failure":
            return {
                input: 'Option.some(Result.fail("boom"))',
                operation: "TxDeferred.await(deferred)",
                result: 'Effect fails with "boom"',
                invariant: "stored E becomes the typed Effect failure",
                implementation: "Effect.fail(result.failure)",
                guidance:
                    "Use Effect error handling around await when the producer may complete with failure.",
            }
    }
}

export const complete_snapshot = (model: Model): Snapshot => {
    switch (model.completeCase) {
        case "Succeed":
            return {
                input: "empty deferred + value 42",
                operation: "TxDeferred.succeed(deferred, 42)",
                result: "true · stored Result.succeed(42)",
                invariant: "only first completion changes state",
                implementation: "done(self, Result.succeed(value))",
                guidance:
                    "Use succeed for the common successful producer path.",
            }
        case "Fail":
            return {
                input: 'empty deferred + error "boom"',
                operation: 'TxDeferred.fail(deferred, "boom")',
                result: 'true · stored Result.fail("boom")',
                invariant: "await later fails with the same typed error",
                implementation: "done(self, Result.fail(error))",
                guidance:
                    "Use fail when completion itself is a typed domain failure.",
            }
        case "Done":
            return {
                input: "already-computed Result<A, E>",
                operation: "TxDeferred.done(deferred, result)",
                result: "boolean completion status",
                invariant: "Result is stored unchanged",
                implementation: "one TxRef.modify over Option<Result>",
                guidance: "Use done when producer logic already has a Result.",
            }
        case "FirstWins":
            return {
                input: "two completion attempts",
                operation: "succeed(42), then succeed(99)",
                result: "[true, false] · stored value remains 42",
                invariant: "write-once semantics",
                implementation: "Option.some(current) => [false, current]",
                guidance:
                    "Check the boolean when competing writers need to know whether they won completion.",
            }
    }
}

export const inspect_snapshot = (model: Model): Snapshot => {
    switch (model.inspectCase) {
        case "PollEmpty":
            return {
                input: "new TxDeferred",
                operation: "TxDeferred.poll(deferred)",
                result: "Option.none()",
                invariant:
                    "poll never txRetry-s just because the cell is empty",
                implementation: "direct TxRef.get",
                guidance:
                    "Use poll for opportunistic inspection without transactional waiting.",
            }
        case "PollSuccess":
            return {
                input: "completed with succeed(42)",
                operation: "TxDeferred.poll(deferred)",
                result: "Option.some(Result.succeed(42))",
                invariant: "poll preserves the Result wrapper",
                implementation: "reads Option<Result<A, E>>",
                guidance:
                    "Pattern-match Option first, then Result, when both empty and failure states matter.",
            }
        case "PollFailure":
            return {
                input: 'completed with fail("boom")',
                operation: "TxDeferred.poll(deferred)",
                result: 'Option.some(Result.fail("boom"))',
                invariant: "poll itself does not fail with E",
                implementation: "failure stays data inside Result",
                guidance:
                    "Choose poll instead of await when failure should be inspected as data rather than raised.",
            }
        case "Transaction":
            return {
                input: "TxRef version + empty TxDeferred",
                operation: "Effect.tx(set version + complete deferred)",
                result: "both changes commit atomically",
                invariant: "no observer sees only one side of the invariant",
                implementation: "shared transactional journal",
                guidance:
                    "Use one explicit transaction for invariants spanning the deferred and other transactional state.",
            }
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Empty",
    waitCase: "Await",
    completeCase: "Succeed",
    inspectCase: "PollEmpty",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxDeferredStage: { stage: Stage },
    SelectedTxDeferredCreateCase: { createCase: CreateCase },
    SelectedTxDeferredWaitCase: { waitCase: WaitCase },
    SelectedTxDeferredCompleteCase: { completeCase: CompleteCase },
    SelectedTxDeferredInspectCase: { inspectCase: InspectCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type WaitCasePayload = Readonly<{ waitCase: WaitCase }>
type CompleteCasePayload = Readonly<{ completeCase: CompleteCase }>
type InspectCasePayload = Readonly<{ inspectCase: InspectCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxDeferredStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxDeferredCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxDeferredWaitCase: ({ waitCase }: WaitCasePayload) => ({
            model: modifyFields(model, { waitCase: () => waitCase }),
        }),
        SelectedTxDeferredCompleteCase: ({
            completeCase,
        }: CompleteCasePayload) => ({
            model: modifyFields(model, { completeCase: () => completeCase }),
        }),
        SelectedTxDeferredInspectCase: ({
            inspectCase,
        }: InspectCasePayload) => ({
            model: modifyFields(model, { inspectCase: () => inspectCase }),
        }),
    })
