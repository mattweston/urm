import {
    Deferred,
    Effect,
    Exit,
    Fiber,
    FiberHandle,
    Option,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Manage"),
    S.Literal("Replace"),
    S.Literal("Wait"),
    S.Literal("Runtime"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Manage",
    "Replace",
    "Wait",
    "Runtime",
]

export const ReplaceMode = S.Union([
    S.Literal("Replace"),
    S.Literal("OnlyIfMissing"),
])
export type ReplaceMode = typeof ReplaceMode.Type

export const Model = S.Struct({
    stage: Stage,
    replaceMode: ReplaceMode,
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
        eyebrow: "one fiber per scope",
        title: "A FiberHandle owns at most one live fiber",
        description:
            "FiberHandle.make is scoped. run installs a managed fiber, get / getUnsafe inspect it, clear interrupts it, and completed fibers remove themselves automatically.",
        code: `const handle =
    yield* FiberHandle.make()

const before =
    FiberHandle.getUnsafe(handle)
// None

const fiber =
    yield* FiberHandle.run(
        handle,
        Effect.never
    )

yield* FiberHandle.get(handle)
// Some(fiber)

yield* FiberHandle.clear(handle)
// fiber interrupted, handle empty`,
        apis: [
            "FiberHandle.make",
            "FiberHandle.run",
            "FiberHandle.get",
            "FiberHandle.getUnsafe",
            "FiberHandle.clear",
            "FiberHandle.isFiberHandle",
            "FiberHandle.set",
            "FiberHandle.setUnsafe",
        ],
        notice: "The owning Scope is part of the safety model: closing it marks the handle Closed and interrupts the currently managed fiber. A finished managed fiber is automatically removed.",
    },

    Replace: {
        eyebrow: "replacement policy",
        title: "New work interrupts old work unless onlyIfMissing is set",
        description:
            "The default behavior is latest-write-wins: installing a new fiber interrupts the current one. onlyIfMissing flips that policy—the existing fiber stays and the incoming fiber is immediately interrupted.",
        code: `const first =
    yield* FiberHandle.run(
        handle,
        Effect.never
    )

const second =
    yield* FiberHandle.run(
        handle,
        nextEffect,
        {
            onlyIfMissing: true
        }
    )

// existing first stays managed
// incoming second is interrupted`,
        apis: ["FiberHandle.run", "FiberHandle.set", "FiberHandle.setUnsafe"],
        notice: "Passing the exact same Fiber to setUnsafe is a no-op. With onlyIfMissing, a different incoming fiber is interrupted rather than replacing the current one.",
    },

    Wait: {
        eyebrow: "two different waits",
        title: "awaitEmpty waits for completion; join waits for failure or closure",
        description:
            "awaitEmpty tracks the current fiber and returns when that fiber finishes. join listens to the handle's failure Deferred: normal success only empties the handle, while a reportable managed-fiber failure fails join.",
        code: `yield* FiberHandle.run(
    handle,
    shortEffect
)

yield* FiberHandle.awaitEmpty(
    handle
)
// current fiber finished; handle empty

yield* FiberHandle.run(
    handle,
    Effect.fail("boom")
)

yield* FiberHandle.join(handle)
// fails with "boom"`,
        apis: ["FiberHandle.awaitEmpty", "FiberHandle.join", "FiberHandle.get"],
        notice: "join is not a normal 'join the current fiber' operation. Successful completion does not complete join; the handle's failure signal is completed by non-ignored managed-fiber failures or by scope closure.",
    },

    Runtime: {
        eyebrow: "imperative boundaries",
        title: "Capture an Effect runtime behind a single-fiber runner",
        description:
            "runtime and makeRuntime return synchronous functions that fork Effects into a handle. Promise variants expose the same replacement semantics to Promise-based code.",
        code: `const run =
    yield* FiberHandle.makeRuntime<
        never,
        never,
        number
    >()

const fiber =
    run(
        Effect.succeed(42)
    )

yield* Fiber.join(fiber)
// 42

// Promise boundary:
// makeRuntimePromise()
// runtimePromise(handle)`,
        apis: [
            "FiberHandle.makeRuntime",
            "FiberHandle.makeRuntimePromise",
            "FiberHandle.runtime",
            "FiberHandle.runtimePromise",
        ],
        notice: "The runtime runners capture the required Context once, then can be called from ordinary synchronous or Promise-oriented code. They still obey the handle's replacement and scope rules.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ManageSnapshot = Readonly<{
    isFiberHandle: boolean
    initial: "None" | "Some"
    duringUnsafe: "None" | "Some"
    duringEffectful: "None" | "Some"
    afterClear: "None" | "Some"
    fiberInterrupted: boolean
    state: string
}>

export const manage_snapshot = (): ManageSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const handle = yield* FiberHandle.make<never, never>()

                const initial = FiberHandle.getUnsafe(handle)

                const fiber = yield* FiberHandle.run(handle, Effect.never)

                const duringUnsafe = FiberHandle.getUnsafe(handle)

                const duringEffectful = yield* FiberHandle.get(handle)

                yield* FiberHandle.clear(handle)

                const exit = yield* Fiber.await(fiber)

                return {
                    isFiberHandle: FiberHandle.isFiberHandle(handle),
                    initial: Option.isSome(initial) ? "Some" : "None",
                    duringUnsafe: Option.isSome(duringUnsafe) ? "Some" : "None",
                    duringEffectful: Option.isSome(duringEffectful)
                        ? "Some"
                        : "None",
                    afterClear: Option.isSome(FiberHandle.getUnsafe(handle))
                        ? "Some"
                        : "None",
                    fiberInterrupted: Exit.hasInterrupts(exit),
                    state: handle.state._tag,
                } as const
            })
        )
    )

export type ReplaceSnapshot = Readonly<{
    mode: ReplaceMode
    managedAfterSecond: string
    incomingInterrupted: boolean
    firstIsCurrent: boolean
    firstEventuallyInterrupted: boolean
    secondResult: string
    policy: string
}>

export const replace_snapshot = (model: Model): ReplaceSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const handle = yield* FiberHandle.make<string, never>()

                const first = yield* FiberHandle.run(handle, Effect.never)

                if (model.replaceMode === "OnlyIfMissing") {
                    const second = yield* FiberHandle.run(
                        handle,
                        Effect.succeed("second"),
                        {
                            onlyIfMissing: true,
                        }
                    )

                    const secondExit = yield* Fiber.await(second)

                    const current = FiberHandle.getUnsafe(handle)

                    const firstIsCurrent =
                        Option.isSome(current) && current.value === first

                    yield* FiberHandle.clear(handle)

                    const firstExit = yield* Fiber.await(first)

                    return {
                        mode: model.replaceMode,
                        managedAfterSecond: firstIsCurrent ? "first" : "other",
                        incomingInterrupted: Exit.hasInterrupts(secondExit),
                        firstIsCurrent,
                        firstEventuallyInterrupted:
                            Exit.hasInterrupts(firstExit),
                        secondResult: "interrupted",
                        policy: "keep existing; reject incoming",
                    } as const
                }

                const gate = yield* Deferred.make<string>()

                const second = yield* FiberHandle.run(
                    handle,
                    Deferred.await(gate)
                )

                const firstExit = yield* Fiber.await(first)

                const current = FiberHandle.getUnsafe(handle)

                const secondIsCurrent =
                    Option.isSome(current) && current.value === second

                yield* Deferred.succeed(gate, "second")

                const secondExit = yield* Fiber.await(second)

                return {
                    mode: model.replaceMode,
                    managedAfterSecond: secondIsCurrent ? "second" : "other",
                    incomingInterrupted: Exit.hasInterrupts(secondExit),
                    firstIsCurrent: false,
                    firstEventuallyInterrupted: Exit.hasInterrupts(firstExit),
                    secondResult: Exit.isSuccess(secondExit)
                        ? secondExit.value
                        : "failure",
                    policy: "interrupt existing; install incoming",
                } as const
            })
        )
    )

export type WaitSnapshot = Readonly<{
    awaitEmptyBefore: "Some" | "None"
    awaitEmptyAfter: "Some" | "None"
    awaitEmptyResult: string
    joinExit: string
    joinTypedError: string
}>

export const wait_snapshot = (): WaitSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const successHandle = yield* FiberHandle.make<string, never>()

                const gate = yield* Deferred.make<string>()

                yield* FiberHandle.run(successHandle, Deferred.await(gate))

                const before = FiberHandle.getUnsafe(successHandle)

                yield* Deferred.succeed(gate, "done")

                yield* FiberHandle.awaitEmpty(successHandle)

                const after = FiberHandle.getUnsafe(successHandle)

                const failureHandle = yield* FiberHandle.make<never, string>()

                yield* FiberHandle.run(failureHandle, Effect.fail("boom"))

                const joinExit = yield* Effect.exit(
                    FiberHandle.join(failureHandle)
                )

                return {
                    awaitEmptyBefore: Option.isSome(before) ? "Some" : "None",
                    awaitEmptyAfter: Option.isSome(after) ? "Some" : "None",
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

export type RuntimeSnapshot = Readonly<{
    makeRuntimeResult: number
    runtimeExistingResult: number
    promiseVariants: string
    replacementSemantics: string
}>

export const runtime_snapshot = (): RuntimeSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const run = yield* FiberHandle.makeRuntime<
                    never,
                    never,
                    number
                >()

                const fiber = run(Effect.succeed(42))

                const makeRuntimeResult = yield* Fiber.join(fiber)

                const handle = yield* FiberHandle.make<number, never>()

                const runExisting = yield* FiberHandle.runtime(handle)<never>()

                const existingFiber = runExisting(Effect.succeed(7))

                const runtimeExistingResult = yield* Fiber.join(existingFiber)

                return {
                    makeRuntimeResult,
                    runtimeExistingResult,
                    promiseVariants: "makeRuntimePromise / runtimePromise",
                    replacementSemantics: "same FiberHandle policy",
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFiberHandleStage: {
        stage: Stage,
    },
    SelectedFiberHandleReplaceMode: {
        replaceMode: ReplaceMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Manage",
    replaceMode: "Replace",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ReplaceModePayload = Readonly<{
    replaceMode: ReplaceMode
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedFiberHandleStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedFiberHandleReplaceMode: ({
            replaceMode,
        }: ReplaceModePayload) => ({
            model: evo(model, {
                replaceMode: () => replaceMode,
            }),
        }),
    })
