import {
    Deferred,
    Effect,
    Exit,
    Fiber,
    FiberMap,
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
        eyebrow: "keyed fiber ownership",
        title: "Different keys can run concurrently inside one scoped map",
        description:
            "FiberMap owns fibers by key. run installs work, size / has / get inspect the live map, remove interrupts one key, clear interrupts all keys, and finished fibers remove themselves.",
        code: `const map =
    yield* FiberMap.make<string>()

yield* FiberMap.run(
    map,
    "search",
    Effect.never
)

yield* FiberMap.run(
    map,
    "autosave",
    Effect.never
)

yield* FiberMap.size(map)
// 2

yield* FiberMap.remove(
    map,
    "search"
)
// autosave keeps running`,
        apis: [
            "FiberMap.make",
            "FiberMap.run",
            "FiberMap.size",
            "FiberMap.has",
            "FiberMap.hasUnsafe",
            "FiberMap.get",
            "FiberMap.getUnsafe",
            "FiberMap.remove",
            "FiberMap.clear",
            "FiberMap.isFiberMap",
        ],
        notice: "FiberMap differs from FiberHandle by key cardinality: one fiber per key, not one fiber total. Closing the owning Scope interrupts every remaining managed fiber.",
    },

    Replace: {
        eyebrow: "per-key replacement",
        title: "Only the existing fiber for the same key is replaced",
        description:
            "Starting work under an occupied key interrupts that key's previous fiber. Other keys continue untouched. onlyIfMissing keeps the existing keyed fiber and interrupts the incoming one.",
        code: `const first =
    yield* FiberMap.run(
        map,
        "search",
        Effect.never
    )

const second =
    yield* FiberMap.run(
        map,
        "search",
        nextSearch
    )

// first interrupted
// second stored at "search"
// "autosave" is unaffected

yield* FiberMap.run(
    map,
    "search",
    anotherSearch,
    { onlyIfMissing: true }
)
// current search stays`,
        apis: [
            "FiberMap.run",
            "FiberMap.set",
            "FiberMap.setUnsafe",
            "FiberMap.getUnsafe",
        ],
        notice: "Re-registering the exact same Fiber under the same key is a no-op. onlyIfMissing rejects a different incoming fiber by interrupting it rather than replacing the current entry.",
    },

    Wait: {
        eyebrow: "completion vs failure",
        title: "awaitEmpty waits for zero fibers; join waits for failure or closure",
        description:
            "awaitEmpty waits until all currently managed fibers have completed and removed themselves. join instead listens to the map's shared failure Deferred and fails on the first reportable managed-fiber failure.",
        code: `yield* FiberMap.run(
    map,
    "a",
    shortA
)

yield* FiberMap.run(
    map,
    "b",
    shortB
)

yield* FiberMap.awaitEmpty(map)
// size is now 0

yield* FiberMap.run(
    map,
    "worker",
    Effect.fail("boom")
)

yield* FiberMap.join(map)
// fails with "boom"`,
        apis: ["FiberMap.awaitEmpty", "FiberMap.join", "FiberMap.size"],
        notice: "Normal success only removes an entry; it does not complete join. Interruption-only exits are ignored by default so remove, clear, replacement, and scope shutdown do not normally become parent failures.",
    },

    Runtime: {
        eyebrow: "imperative keyed runners",
        title: "Capture the Effect runtime behind key-aware fork functions",
        description:
            "runtime and makeRuntime return synchronous functions taking key + Effect. Promise variants expose the same keyed replacement policy to Promise-oriented integrations.",
        code: `const run =
    yield* FiberMap.makeRuntime<
        never,
        string,
        never,
        number
    >()

const a =
    run(
        "a",
        Effect.succeed(1)
    )

const b =
    run(
        "b",
        Effect.succeed(2)
    )

yield* Fiber.join(a) // 1
yield* Fiber.join(b) // 2`,
        apis: [
            "FiberMap.makeRuntime",
            "FiberMap.makeRuntimePromise",
            "FiberMap.runtime",
            "FiberMap.runtimePromise",
        ],
        notice: "Captured runners preserve keyed semantics: unrelated keys coexist, while calls using the same key replace unless onlyIfMissing is set. Promise failures reject with the squashed Cause.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: MANAGE
// -----------------------------------------------------------------------------

export type ManageSnapshot = Readonly<{
    isFiberMap: boolean
    initialSize: number
    runningSize: number
    hasSearch: boolean
    hasAutosave: boolean
    getSearch: "None" | "Some"
    iteratedKeys: string
    afterRemoveSize: number
    searchInterrupted: boolean
    autosaveStillPresent: boolean
    afterClearSize: number
    autosaveInterrupted: boolean
}>

export const manage_snapshot = (): ManageSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const map = yield* FiberMap.make<string, never, never>()

                const initialSize = yield* FiberMap.size(map)

                const searchFiber = yield* FiberMap.run(
                    map,
                    "search",
                    Effect.never
                )

                const autosaveFiber = yield* FiberMap.run(
                    map,
                    "autosave",
                    Effect.never
                )

                const runningSize = yield* FiberMap.size(map)

                const hasSearch = yield* FiberMap.has(map, "search")

                const hasAutosave = FiberMap.hasUnsafe(map, "autosave")

                const search = yield* FiberMap.get(map, "search")

                const iteratedKeys = Array.from(map)
                    .map(([key]) => key)
                    .sort()
                    .join(", ")

                yield* FiberMap.remove(map, "search")

                const searchExit = yield* Fiber.await(searchFiber)

                const afterRemoveSize = yield* FiberMap.size(map)

                const autosaveStillPresent = FiberMap.hasUnsafe(map, "autosave")

                yield* FiberMap.clear(map)

                const autosaveExit = yield* Fiber.await(autosaveFiber)

                const afterClearSize = yield* FiberMap.size(map)

                return {
                    isFiberMap: FiberMap.isFiberMap(map),
                    initialSize,
                    runningSize,
                    hasSearch,
                    hasAutosave,
                    getSearch: Option.isSome(search) ? "Some" : "None",
                    iteratedKeys,
                    afterRemoveSize,
                    searchInterrupted: Exit.hasInterrupts(searchExit),
                    autosaveStillPresent,
                    afterClearSize,
                    autosaveInterrupted: Exit.hasInterrupts(autosaveExit),
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// SNAPSHOTS: REPLACE
// -----------------------------------------------------------------------------

export type ReplaceSnapshot = Readonly<{
    mode: ReplaceMode
    sizeWithSibling: number
    managedSearch: string
    firstInterrupted: boolean
    incomingInterrupted: boolean
    siblingStillPresent: boolean
    replacementResult: string
    policy: string
}>

export const replace_snapshot = (model: Model): ReplaceSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const map = yield* FiberMap.make<string, string, never>()

                const firstSearch = yield* FiberMap.run(
                    map,
                    "search",
                    Effect.never
                )

                yield* FiberMap.run(map, "autosave", Effect.never)

                if (model.replaceMode === "OnlyIfMissing") {
                    const incoming = yield* FiberMap.run(
                        map,
                        "search",
                        Effect.succeed("new search"),
                        {
                            onlyIfMissing: true,
                        }
                    )

                    const incomingExit = yield* Fiber.await(incoming)

                    const current = FiberMap.getUnsafe(map, "search")

                    const firstIsCurrent =
                        Option.isSome(current) && current.value === firstSearch

                    const sizeWithSibling = yield* FiberMap.size(map)

                    const siblingStillPresent = FiberMap.hasUnsafe(
                        map,
                        "autosave"
                    )

                    yield* FiberMap.clear(map)

                    const firstExit = yield* Fiber.await(firstSearch)

                    return {
                        mode: model.replaceMode,
                        sizeWithSibling,
                        managedSearch: firstIsCurrent ? "first" : "other",
                        firstInterrupted: Exit.hasInterrupts(firstExit),
                        incomingInterrupted: Exit.hasInterrupts(incomingExit),
                        siblingStillPresent,
                        replacementResult: "incoming rejected",
                        policy: "keep existing search",
                    } as const
                }

                const gate = yield* Deferred.make<string>()

                const replacement = yield* FiberMap.run(
                    map,
                    "search",
                    Deferred.await(gate)
                )

                const firstExit = yield* Fiber.await(firstSearch)

                const current = FiberMap.getUnsafe(map, "search")

                const replacementIsCurrent =
                    Option.isSome(current) && current.value === replacement

                const sizeWithSibling = yield* FiberMap.size(map)

                const siblingStillPresent = FiberMap.hasUnsafe(map, "autosave")

                yield* Deferred.succeed(gate, "new search")

                const replacementExit = yield* Fiber.await(replacement)

                return {
                    mode: model.replaceMode,
                    sizeWithSibling,
                    managedSearch: replacementIsCurrent
                        ? "replacement"
                        : "other",
                    firstInterrupted: Exit.hasInterrupts(firstExit),
                    incomingInterrupted: Exit.hasInterrupts(replacementExit),
                    siblingStillPresent,
                    replacementResult: Exit.isSuccess(replacementExit)
                        ? replacementExit.value
                        : "failure",
                    policy: "replace same key only",
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// SNAPSHOTS: WAIT
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
                const map = yield* FiberMap.make<string, string, never>()

                const gateA = yield* Deferred.make<string>()

                const gateB = yield* Deferred.make<string>()

                yield* FiberMap.run(map, "a", Deferred.await(gateA))

                yield* FiberMap.run(map, "b", Deferred.await(gateB))

                const beforeSize = yield* FiberMap.size(map)

                yield* Deferred.succeed(gateA, "a")

                yield* Deferred.succeed(gateB, "b")

                yield* FiberMap.awaitEmpty(map)

                const afterEmptySize = yield* FiberMap.size(map)

                const failureMap = yield* FiberMap.make<string, never, string>()

                yield* FiberMap.run(failureMap, "worker", Effect.fail("boom"))

                const joinExit = yield* Effect.exit(FiberMap.join(failureMap))

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
// SNAPSHOTS: RUNTIME
// -----------------------------------------------------------------------------

export type RuntimeSnapshot = Readonly<{
    makeRuntimeA: number
    makeRuntimeB: number
    runtimeExisting: number
    distinctKeys: string
    promiseVariants: string
}>

export const runtime_snapshot = (): RuntimeSnapshot =>
    Effect.runSync(
        Effect.scoped(
            Effect.gen(function* () {
                const run = yield* FiberMap.makeRuntime<
                    never,
                    string,
                    never,
                    number
                >()

                const fiberA = run("a", Effect.succeed(1))

                const fiberB = run("b", Effect.succeed(2))

                const makeRuntimeA = yield* Fiber.join(fiberA)

                const makeRuntimeB = yield* Fiber.join(fiberB)

                const map = yield* FiberMap.make<string, number, never>()

                const runExisting = yield* FiberMap.runtime(map)<never>()

                const fiberC = runExisting("c", Effect.succeed(3))

                const runtimeExisting = yield* Fiber.join(fiberC)

                return {
                    makeRuntimeA,
                    makeRuntimeB,
                    runtimeExisting,
                    distinctKeys: "a + b coexist",
                    promiseVariants: "makeRuntimePromise / runtimePromise",
                } as const
            })
        )
    )

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFiberMapStage: {
        stage: Stage,
    },
    SelectedFiberMapReplaceMode: {
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
        SelectedFiberMapStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedFiberMapReplaceMode: ({ replaceMode }: ReplaceModePayload) => ({
            model: modifyFields(model, {
                replaceMode: () => replaceMode,
            }),
        }),
    })
