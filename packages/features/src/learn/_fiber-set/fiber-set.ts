import {
    Deferred,
    Effect,
    Exit,
    Fiber,
    FiberSet,
    Option,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Manage"),
    S.Literal("Add"),
    S.Literal("Wait"),
    S.Literal("Runtime"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Manage", "Add", "Wait", "Runtime"]

export const AddMode = S.Union([S.Literal("Safe"), S.Literal("Unsafe")])
export type AddMode = typeof AddMode.Type

export const Model = S.Struct({
    stage: Stage,
    addMode: AddMode,
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
    Manage: {
        eyebrow: "many fibers, one scope",
        title: "FiberSet tracks independent fibers as one managed group",
        description:
            "Every run adds another fiber. Different fibers coexist, finished fibers remove themselves, clear interrupts everything still running, and scope closure performs the same bulk cleanup.",
        code: `const set =
    yield* FiberSet.make()

yield* FiberSet.run(
    set,
    Effect.never
)

yield* FiberSet.run(
    set,
    Effect.never
)

yield* FiberSet.size(set)
// 2

yield* FiberSet.clear(set)
// all managed fibers interrupted`,
        apis: [
            "FiberSet.make",
            "FiberSet.run",
            "FiberSet.size",
            "FiberSet.clear",
            "FiberSet.isFiberSet",
        ],
        notice: "Unlike FiberHandle and FiberMap, FiberSet has no replacement identity. Every distinct added fiber can coexist until it completes, is cleared, or the owning Scope closes.",
    },

    Add: {
        eyebrow: "register existing fibers",
        title: "add and addUnsafe adopt fibers that were forked elsewhere",
        description:
            "Use add when registration should stay inside Effect, or addUnsafe for synchronous mutation. Adding the same Fiber object twice is a no-op because the backing collection is a Set.",
        code: `const fiber =
    yield* Effect.forkChild(
        Effect.never
    )

yield* FiberSet.add(
    set,
    fiber
)

FiberSet.addUnsafe(
    set,
    fiber
)

// same Fiber is still one entry`,
        apis: ["FiberSet.add", "FiberSet.addUnsafe", "FiberSet.size"],
        notice: "If the FiberSet is already closed, addUnsafe immediately interrupts the incoming fiber. Managed fibers register an observer so they remove themselves after completion.",
    },

    Wait: {
        eyebrow: "completion vs failure",
        title: "awaitEmpty waits for zero fibers; join waits for failure or closure",
        description:
            "awaitEmpty repeatedly waits for managed fibers until the set is empty. join listens to the set's failure Deferred and fails with the first non-ignored managed-fiber failure.",
        code: `yield* FiberSet.run(
    set,
    taskA
)

yield* FiberSet.run(
    set,
    taskB
)

yield* FiberSet.awaitEmpty(set)
// size = 0

yield* FiberSet.run(
    set,
    Effect.fail("boom")
)

yield* FiberSet.join(set)
// fails with "boom"`,
        apis: ["FiberSet.awaitEmpty", "FiberSet.join", "FiberSet.size"],
        notice: "Normal successful completion only removes a fiber; it does not complete join. Interruption-only exits are ignored by default, so clear and scope shutdown do not normally become parent failures.",
    },

    Runtime: {
        eyebrow: "imperative fan-out",
        title: "Captured runtimes can launch many managed fibers",
        description:
            "runtime and makeRuntime expose synchronous fork functions backed by the set. Promise variants bridge the same many-fiber ownership model to Promise-oriented APIs.",
        code: `const run =
    yield* FiberSet.makeRuntime<
        never,
        number,
        never
    >()

const a =
    run(Effect.succeed(1))

const b =
    run(Effect.succeed(2))

yield* Fiber.join(a) // 1
yield* Fiber.join(b) // 2

// Promise variants:
// makeRuntimePromise
// runtimePromise`,
        apis: [
            "FiberSet.makeRuntime",
            "FiberSet.makeRuntimePromise",
            "FiberSet.runtime",
            "FiberSet.runtimePromise",
        ],
        notice: "Captured runners do not serialize work: each call forks and adds another independent fiber. Promise failures reject with the squashed Cause while the underlying fiber remains scope-managed.",
    },
}

// -----------------------------------------------------------------------------
// MANAGE SNAPSHOT
// -----------------------------------------------------------------------------

export type ManageSnapshot = Readonly<{
    isFiberSet: boolean
    initialSize: number
    runningSize: number
    iteratedCount: number
    afterClearSize: number
    interruptedCount: number
    stateInsideScope: string
}>

export const manage_snapshot = (): ManageSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const set = yield* FiberSet.make<never, never>()

                const initialSize = yield* FiberSet.size(set)

                const first = yield* FiberSet.run(set, Effect.never)

                const second = yield* FiberSet.run(set, Effect.never)

                const third = yield* FiberSet.run(set, Effect.never)

                const runningSize = yield* FiberSet.size(set)

                const iteratedCount = Array.from(set).length

                yield* FiberSet.clear(set)

                const firstExit = yield* Fiber.await(first)

                const secondExit = yield* Fiber.await(second)

                const thirdExit = yield* Fiber.await(third)

                const afterClearSize = yield* FiberSet.size(set)

                const interruptedCount = [
                    firstExit,
                    secondExit,
                    thirdExit,
                ].filter((exit: Exit.Exit<never, never>) =>
                    Exit.hasInterrupts(exit)
                ).length

                return {
                    isFiberSet: FiberSet.isFiberSet(set),
                    initialSize,
                    runningSize,
                    iteratedCount,
                    afterClearSize,
                    interruptedCount,
                    stateInsideScope: set.state._tag,
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// ADD SNAPSHOT
// -----------------------------------------------------------------------------

export type AddSnapshot = Readonly<{
    mode: AddMode
    sizeAfterFirst: number
    sizeAfterDuplicate: number
    sizeWithSecondFiber: number
    afterFirstCompletes: number
    secondInterrupted: boolean
    duplicateWasNoOp: boolean
}>

export const add_snapshot = (model: Model): AddSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const set = yield* FiberSet.make<string, never>()

                const firstGate = yield* Deferred.make<string>()

                const secondGate = yield* Deferred.make<string>()

                const first = yield* Effect.forkChild(Deferred.await(firstGate))

                const second = yield* Effect.forkChild(
                    Deferred.await(secondGate)
                )

                if (model.addMode === "Unsafe") {
                    FiberSet.addUnsafe(set, first)
                } else {
                    yield* FiberSet.add(set, first)
                }

                const sizeAfterFirst = yield* FiberSet.size(set)

                FiberSet.addUnsafe(set, first)

                const sizeAfterDuplicate = yield* FiberSet.size(set)

                if (model.addMode === "Unsafe") {
                    FiberSet.addUnsafe(set, second)
                } else {
                    yield* FiberSet.add(set, second)
                }

                const sizeWithSecondFiber = yield* FiberSet.size(set)

                yield* Deferred.succeed(firstGate, "first")

                yield* Fiber.await(first)

                yield* Effect.yieldNow

                const afterFirstCompletes = yield* FiberSet.size(set)

                yield* FiberSet.clear(set)

                const secondExit = yield* Fiber.await(second)

                return {
                    mode: model.addMode,
                    sizeAfterFirst,
                    sizeAfterDuplicate,
                    sizeWithSecondFiber,
                    afterFirstCompletes,
                    secondInterrupted: Exit.hasInterrupts(secondExit),
                    duplicateWasNoOp: sizeAfterFirst === sizeAfterDuplicate,
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// WAIT SNAPSHOT
// -----------------------------------------------------------------------------

export type WaitSnapshot = Readonly<{
    beforeSize: number
    afterEmptySize: number
    awaitEmptyResult: string
    joinExit: string
    joinTypedError: string
}>

export const wait_snapshot = (): WaitSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const set = yield* FiberSet.make<string, never>()

                const gateA = yield* Deferred.make<string>()

                const gateB = yield* Deferred.make<string>()

                yield* FiberSet.run(set, Deferred.await(gateA))

                yield* FiberSet.run(set, Deferred.await(gateB))

                const beforeSize = yield* FiberSet.size(set)

                yield* Deferred.succeed(gateA, "a")

                yield* Deferred.succeed(gateB, "b")

                yield* FiberSet.awaitEmpty(set)

                const afterEmptySize = yield* FiberSet.size(set)

                const failureSet = yield* FiberSet.make<never, string>()

                yield* FiberSet.run(failureSet, Effect.fail("boom"))

                const joinExit = yield* Effect.exit(FiberSet.join(failureSet))

                return {
                    beforeSize,
                    afterEmptySize,
                    awaitEmptyResult: "void",
                    joinExit: joinExit._tag,
                    joinTypedError: Option.match(
                        Exit.findErrorOption(joinExit),
                        {
                            onNone: () => "None",
                            onSome: (error: string) => error,
                        }
                    ),
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// RUNTIME SNAPSHOT
// -----------------------------------------------------------------------------

export type RuntimeSnapshot = Readonly<{
    first: number
    second: number
    existing: number
    fanOut: string
    promiseVariants: string
}>

export const runtime_snapshot = (): RuntimeSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const run = yield* FiberSet.makeRuntime<never, number, never>()

                const firstFiber = run(Effect.succeed(1))

                const secondFiber = run(Effect.succeed(2))

                const first = yield* Fiber.join(firstFiber)

                const second = yield* Fiber.join(secondFiber)

                const set = yield* FiberSet.make<number, never>()

                const runExisting = yield* FiberSet.runtime(set)<never>()

                const existingFiber = runExisting(Effect.succeed(3))

                const existing = yield* Fiber.join(existingFiber)

                return {
                    first,
                    second,
                    existing,
                    fanOut: "all calls may coexist",
                    promiseVariants: "makeRuntimePromise / runtimePromise",
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFiberSetStage: {
        stage: Stage,
    },
    SelectedFiberSetAddMode: {
        addMode: AddMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Manage",
    addMode: "Safe",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type AddModePayload = Readonly<{
    addMode: AddMode
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedFiberSetStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedFiberSetAddMode: ({ addMode }: AddModePayload) => ({
            model: modifyFields(model, {
                addMode: () => addMode,
            }),
        }),
    })
