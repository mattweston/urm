import { Data, Effect, Fiber, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect fiber examples
// -----------------------------------------------------------------------------

export class TaskError extends Data.TaggedError("TaskError")<{
    readonly message: string
}> {}

export const fork_and_join = Effect.gen(function* () {
    const task = Effect.delay(Effect.succeed(42), "800 millis")

    // Effect is a lazy description. forkChild starts a supervised child Fiber.
    const fiber = yield* Effect.forkChild(task)

    // join waits for the child and re-enters its success / error channels.
    return yield* Fiber.join(fiber)
})

export const fork_two_children = Effect.gen(function* () {
    const users_fiber = yield* Effect.forkChild(
        Effect.delay(Effect.succeed("users"), "700 millis")
    )
    const posts_fiber = yield* Effect.forkChild(
        Effect.delay(Effect.succeed("posts"), "450 millis")
    )

    // Both fibers are already running before either join begins.
    return yield* Effect.all([Fiber.join(users_fiber), Fiber.join(posts_fiber)])
})

export const join_failure = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(
        Effect.fail(new TaskError({ message: "boom" }))
    )

    // The waiting Effect fails with TaskError.
    return yield* Fiber.join(fiber)
})

export const await_failure = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(
        Effect.fail(new TaskError({ message: "boom" }))
    )

    // await itself succeeds. The child outcome is represented by Exit.
    return yield* Fiber.await(fiber)
})

export const interrupt_and_cleanup = Effect.gen(function* () {
    const worker = Effect.never.pipe(Effect.ensuring(Effect.log("cleanup")))

    const fiber = yield* Effect.forkChild(worker)

    yield* Effect.sleep("20 millis")

    // Fiber.interrupt completes after the child has terminated and its
    // finalizers have finished.
    yield* Fiber.interrupt(fiber)
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Fork"),
    S.Literal("Concurrency"),
    S.Literal("Observe"),
    S.Literal("Interrupt"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Fork",
    "Concurrency",
    "Observe",
    "Interrupt",
]

export const FiberStatus = S.Union([
    S.Literal("Idle"),
    S.Literal("Running"),
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Interrupted"),
])
export type FiberStatus = typeof FiberStatus.Type

export const Outcome = S.Union([S.Literal("Success"), S.Literal("Failure")])
export type Outcome = typeof Outcome.Type

export const ObserveMode = S.Union([S.Literal("Join"), S.Literal("Await")])
export type ObserveMode = typeof ObserveMode.Type

export const Model = S.Struct({
    stage: Stage,

    fork_status: FiberStatus,
    fork_progress: S.Number,

    left_status: FiberStatus,
    left_progress: S.Number,
    right_status: FiberStatus,
    right_progress: S.Number,
    concurrent_has_joined: S.Boolean,

    observe_outcome: Outcome,
    observe_mode: ObserveMode,
    observe_has_run: S.Boolean,

    interrupt_status: FiberStatus,
    interrupt_progress: S.Number,
    finalizer_ran: S.Boolean,
    interrupt_log: S.Array(S.String),
})
export type Model = typeof Model.Type

export const SelectedFiberStage = taggedStruct("SelectedFiberStage", {
    stage: Stage,
})

export const ClickedStartFork = taggedStruct("ClickedStartFork")
export const ClickedAdvanceFork = taggedStruct("ClickedAdvanceFork")
export const ClickedResetFork = taggedStruct("ClickedResetFork")

export const ClickedStartConcurrent = taggedStruct("ClickedStartConcurrent")
export const ClickedAdvanceConcurrent = taggedStruct("ClickedAdvanceConcurrent")
export const ClickedJoinConcurrent = taggedStruct("ClickedJoinConcurrent")
export const ClickedResetConcurrent = taggedStruct("ClickedResetConcurrent")

export const SelectedFiberOutcome = taggedStruct("SelectedFiberOutcome", {
    outcome: Outcome,
})
export const SelectedFiberObserveMode = taggedStruct(
    "SelectedFiberObserveMode",
    {
        mode: ObserveMode,
    }
)
export const ClickedObserveFiber = taggedStruct("ClickedObserveFiber")
export const ClickedResetFiberObservation = taggedStruct(
    "ClickedResetFiberObservation"
)

export const ClickedStartInterruptibleFiber = taggedStruct(
    "ClickedStartInterruptibleFiber"
)
export const ClickedAdvanceInterruptibleFiber = taggedStruct(
    "ClickedAdvanceInterruptibleFiber"
)
export const ClickedInterruptFiber = taggedStruct("ClickedInterruptFiber")
export const ClickedResetInterruptibleFiber = taggedStruct(
    "ClickedResetInterruptibleFiber"
)

export const Message = S.Union([
    SelectedFiberStage,

    ClickedStartFork,
    ClickedAdvanceFork,
    ClickedResetFork,

    ClickedStartConcurrent,
    ClickedAdvanceConcurrent,
    ClickedJoinConcurrent,
    ClickedResetConcurrent,

    SelectedFiberOutcome,
    SelectedFiberObserveMode,
    ClickedObserveFiber,
    ClickedResetFiberObservation,

    ClickedStartInterruptibleFiber,
    ClickedAdvanceInterruptibleFiber,
    ClickedInterruptFiber,
    ClickedResetInterruptibleFiber,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Fork",

    fork_status: "Idle",
    fork_progress: 0,

    left_status: "Idle",
    left_progress: 0,
    right_status: "Idle",
    right_progress: 0,
    concurrent_has_joined: false,

    observe_outcome: "Failure",
    observe_mode: "Join",
    observe_has_run: false,

    interrupt_status: "Idle",
    interrupt_progress: 0,
    finalizer_ran: false,
    interrupt_log: [],
})

type UpdateReturn = Update.Return<Model, Message>

const advance_progress = (
    status: FiberStatus,
    progress: number,
    amount: number
): Readonly<{ status: FiberStatus; progress: number }> => {
    if (status !== "Running") {
        return { status, progress }
    }

    const next = Math.min(100, progress + amount)

    return next >= 100
        ? { status: "Success", progress: 100 }
        : { status: "Running", progress: next }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedFiberStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            ClickedStartFork: () => ({
                model: modifyFields(model, {
                    fork_status: () => "Running",
                    fork_progress: () => 8,
                }),
                commands: [],
            }),

            ClickedAdvanceFork: () => {
                const next = advance_progress(
                    model.fork_status,
                    model.fork_progress,
                    24
                )
                return {
                    model: modifyFields(model, {
                        fork_status: () => next.status,
                        fork_progress: () => next.progress,
                    }),
                    commands: [],
                }
            },

            ClickedResetFork: () => ({
                model: modifyFields(model, {
                    fork_status: () => "Idle",
                    fork_progress: () => 0,
                }),
                commands: [],
            }),

            ClickedStartConcurrent: () => ({
                model: modifyFields(model, {
                    left_status: () => "Running",
                    left_progress: () => 5,
                    right_status: () => "Running",
                    right_progress: () => 7,
                    concurrent_has_joined: () => false,
                }),
                commands: [],
            }),

            ClickedAdvanceConcurrent: () => {
                const left = advance_progress(
                    model.left_status,
                    model.left_progress,
                    18
                )
                const right = advance_progress(
                    model.right_status,
                    model.right_progress,
                    31
                )

                return {
                    model: modifyFields(model, {
                        left_status: () => left.status,
                        left_progress: () => left.progress,
                        right_status: () => right.status,
                        right_progress: () => right.progress,
                    }),
                    commands: [],
                }
            },

            ClickedJoinConcurrent: () => ({
                model: modifyFields(model, {
                    concurrent_has_joined: () => true,
                }),
                commands: [],
            }),

            ClickedResetConcurrent: () => ({
                model: modifyFields(model, {
                    left_status: () => "Idle",
                    left_progress: () => 0,
                    right_status: () => "Idle",
                    right_progress: () => 0,
                    concurrent_has_joined: () => false,
                }),
                commands: [],
            }),

            SelectedFiberOutcome: ({ outcome }) => ({
                model: modifyFields(model, {
                    observe_outcome: () => outcome,
                    observe_has_run: () => false,
                }),
                commands: [],
            }),

            SelectedFiberObserveMode: ({ mode }) => ({
                model: modifyFields(model, {
                    observe_mode: () => mode,
                    observe_has_run: () => false,
                }),
                commands: [],
            }),

            ClickedObserveFiber: () => ({
                model: modifyFields(model, { observe_has_run: () => true }),
                commands: [],
            }),

            ClickedResetFiberObservation: () => ({
                model: modifyFields(model, { observe_has_run: () => false }),
                commands: [],
            }),

            ClickedStartInterruptibleFiber: () => ({
                model: modifyFields(model, {
                    interrupt_status: () => "Running",
                    interrupt_progress: () => 5,
                    finalizer_ran: () => false,
                    interrupt_log: () => [
                        "worker · started",
                        "finalizer · registered",
                    ],
                }),
                commands: [],
            }),

            ClickedAdvanceInterruptibleFiber: () => {
                if (model.interrupt_status !== "Running") {
                    return { model, commands: [] }
                }

                const next = advance_progress(
                    model.interrupt_status,
                    model.interrupt_progress,
                    12
                )

                return {
                    model: modifyFields(model, {
                        interrupt_status: () => next.status,
                        interrupt_progress: () => next.progress,
                        interrupt_log: (log) => [...log, "worker · heartbeat"],
                    }),
                    commands: [],
                }
            },

            ClickedInterruptFiber: () => {
                if (model.interrupt_status !== "Running") {
                    return { model, commands: [] }
                }

                return {
                    model: modifyFields(model, {
                        interrupt_status: () => "Interrupted",
                        finalizer_ran: () => true,
                        interrupt_log: (log) => [
                            ...log,
                            "interrupt · requested",
                            "finalizer · cleanup ran",
                            "fiber · fully terminated",
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetInterruptibleFiber: () => ({
                model: modifyFields(model, {
                    interrupt_status: () => "Idle",
                    interrupt_progress: () => 0,
                    finalizer_ran: () => false,
                    interrupt_log: () => [],
                }),
                commands: [],
            }),
        })
    )

export const concurrent_is_complete = (model: Model): boolean =>
    model.left_status === "Success" && model.right_status === "Success"

export type Observation = Readonly<{
    type: string
    headline: string
    detail: string
    is_failure: boolean
}>

export const observation = (model: Model): Observation => {
    if (model.observe_mode === "Join") {
        return model.observe_outcome === "Success"
            ? {
                  type: "Effect<string, TaskError>",
                  headline: 'value = "done"',
                  detail: "join succeeds with the child Fiber's success value.",
                  is_failure: false,
              }
            : {
                  type: "Effect<string, TaskError>",
                  headline: "TaskError propagates",
                  detail: "join fails the waiting Effect with the child Fiber's error.",
                  is_failure: true,
              }
    }

    return model.observe_outcome === "Success"
        ? {
              type: "Effect<Exit<string, TaskError>>",
              headline: 'Exit.Success("done")',
              detail: "await succeeds with an Exit describing the child outcome.",
              is_failure: false,
          }
        : {
              type: "Effect<Exit<string, TaskError>>",
              headline: "Exit.Failure(TaskError)",
              detail: "the child failure is data inside Exit; the waiting Effect itself succeeds.",
              is_failure: false,
          }
}
