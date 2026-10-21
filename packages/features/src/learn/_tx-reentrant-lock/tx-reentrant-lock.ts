import { Effect, Schema as S, TxReentrantLock } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXREENTRANTLOCK PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    return {
        locked: yield* TxReentrantLock.locked(lock),
        readLocks: yield* TxReentrantLock.readLocks(lock),
        writeLocks: yield* TxReentrantLock.writeLocks(lock),
    }
})

export const read_reentrant_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    const first = yield* TxReentrantLock.acquireRead(lock)
    const second = yield* TxReentrantLock.acquireRead(lock)
    const afterOneRelease = yield* TxReentrantLock.releaseRead(lock)
    const afterTwoReleases = yield* TxReentrantLock.releaseRead(lock)
    return [first, second, afterOneRelease, afterTwoReleases] as const
})

export const write_reentrant_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    const first = yield* TxReentrantLock.acquireWrite(lock)
    const second = yield* TxReentrantLock.acquireWrite(lock)
    const afterOneRelease = yield* TxReentrantLock.releaseWrite(lock)
    const afterTwoReleases = yield* TxReentrantLock.releaseWrite(lock)
    return [first, second, afterOneRelease, afterTwoReleases] as const
})

export const upgrade_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    yield* TxReentrantLock.acquireRead(lock)
    const writeCount = yield* TxReentrantLock.acquireWrite(lock)
    const state = {
        readLocks: yield* TxReentrantLock.readLocks(lock),
        writeLocks: yield* TxReentrantLock.writeLocks(lock),
    }
    yield* TxReentrantLock.releaseWrite(lock)
    yield* TxReentrantLock.releaseRead(lock)
    return [writeCount, state] as const
})

export const scoped_read_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    const held = yield* Effect.scoped(
        Effect.gen(function* () {
            yield* TxReentrantLock.readLock(lock)
            return yield* TxReentrantLock.readLocks(lock)
        })
    )
    return [held, yield* TxReentrantLock.readLocks(lock)] as const
})

export const wrapper_program = Effect.gen(function* () {
    const lock = yield* TxReentrantLock.make()
    const value = yield* TxReentrantLock.withWriteLock(
        lock,
        Effect.succeed("exclusive")
    )
    return [value, yield* TxReentrantLock.locked(lock)] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Read"),
    S.Literal("Write"),
    S.Literal("Scope"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Create", "Read", "Write", "Scope"]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Inspect"),
    S.Literal("Guard"),
    S.Literal("Counts"),
])
export type CreateCase = typeof CreateCase.Type
export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Inspect",
    "Guard",
    "Counts",
]

export const ReadCase = S.Union([
    S.Literal("Acquire"),
    S.Literal("Reentrant"),
    S.Literal("Concurrent"),
    S.Literal("Release"),
])
export type ReadCase = typeof ReadCase.Type
export const read_cases: ReadonlyArray<ReadCase> = [
    "Acquire",
    "Reentrant",
    "Concurrent",
    "Release",
]

export const WriteCase = S.Union([
    S.Literal("Exclusive"),
    S.Literal("Reentrant"),
    S.Literal("Upgrade"),
    S.Literal("Release"),
])
export type WriteCase = typeof WriteCase.Type
export const write_cases: ReadonlyArray<WriteCase> = [
    "Exclusive",
    "Reentrant",
    "Upgrade",
    "Release",
]

export const ScopeCase = S.Union([
    S.Literal("ReadLock"),
    S.Literal("WriteLock"),
    S.Literal("Wrapper"),
    S.Literal("AutoRelease"),
])
export type ScopeCase = typeof ScopeCase.Type
export const scope_cases: ReadonlyArray<ScopeCase> = [
    "ReadLock",
    "WriteLock",
    "Wrapper",
    "AutoRelease",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    readCase: ReadCase,
    writeCase: WriteCase,
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
        eyebrow:
            "Fiber-owned read/write state lives in one transactional reference",
        title: "Create and inspect a reentrant lock",
        description:
            "make creates an unlocked TxReentrantLock. Getter effects inspect total read counts, the current writer's reentrant count, and whether either mode is held.",
        code: `const lock = yield* TxReentrantLock.make()

const state = {
    locked: yield* TxReentrantLock.locked(lock),
    reads: yield* TxReentrantLock.readLocks(lock),
    writes: yield* TxReentrantLock.writeLocks(lock)
}`,
        apis: ["TxReentrantLock.make", "locked", "readLocks", "writeLocks"],
        notice: "The lock is runtime synchronization state. Keep the live lock and its TxRef out of the serializable Foldkit model.",
    },
    Read: {
        eyebrow:
            "Many fibers may read together unless another fiber owns the writer",
        title: "Acquire shared read access",
        description:
            "acquireRead increments the current fiber's read count. The same fiber can acquire repeatedly; another writer causes txRetry, while other readers do not block shared reads.",
        code: `const first = yield* TxReentrantLock.acquireRead(lock)
const second = yield* TxReentrantLock.acquireRead(lock)
// 1, then 2 for the same fiber

yield* TxReentrantLock.releaseRead(lock)
yield* TxReentrantLock.releaseRead(lock)`,
        apis: ["acquireRead", "releaseRead", "readLock", "readLocked"],
        notice: "Reentrancy is counted per fiber. Each successful manual acquisition must be matched by a release to return that fiber's count to zero.",
    },
    Write: {
        eyebrow:
            "One writer owns exclusive access, but ownership is reentrant by fiber",
        title: "Acquire exclusive write access",
        description:
            "acquireWrite retries if another fiber owns the writer or holds a read lock. The owning fiber may reenter, and a fiber holding only its own read locks may upgrade to write.",
        code: `yield* TxReentrantLock.acquireRead(lock)
const writes = yield* TxReentrantLock.acquireWrite(lock)
// upgrade succeeds when no other fiber is reading

yield* TxReentrantLock.releaseWrite(lock)
yield* TxReentrantLock.releaseRead(lock)`,
        apis: ["acquireWrite", "releaseWrite", "writeLock", "writeLocked"],
        notice: "A read→write upgrade does not discard the fiber's read locks. The read and write acquisition counts remain independent until each is released.",
    },
    Scope: {
        eyebrow:
            "Scoped and wrapper forms pair acquisition with release automatically",
        title: "Prefer bracketed lock lifetimes",
        description:
            "readLock and writeLock hold a lock for a Scope. withReadLock, withWriteLock, and withLock bracket an Effect so release runs after success, failure, or interruption.",
        code: `const result = yield* TxReentrantLock.withWriteLock(
    lock,
    Effect.succeed("exclusive work")
)

// withLock is an alias for withWriteLock`,
        apis: [
            "readLock",
            "writeLock",
            "withReadLock",
            "withWriteLock",
            "withLock",
        ],
        notice: "Use manual acquire/release only when the lifetime cannot be expressed with Scope or an acquire/use/release wrapper.",
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
                input: "no initial owner",
                operation: "TxReentrantLock.make()",
                result: "unlocked TxReentrantLock",
                invariant: "readers empty · writer None",
                implementation: "TxRef<LockState>",
                guidance:
                    "Create one lock for the shared resource or invariant you need to protect.",
            }
        case "Inspect":
            return {
                input: "live lock",
                operation: "locked / readLocked / writeLocked",
                result: "boolean status",
                invariant: "status is read transactionally",
                implementation: "TxRef.get(stateRef)",
                guidance:
                    "Use status getters for diagnostics and transactional branching, not as an external mutex protocol.",
            }
        case "Guard":
            return {
                input: "unknown value",
                operation: "isTxReentrantLock(value)",
                result: "type guard boolean",
                invariant: "checks exported runtime identity",
                implementation: "private TypeId marker",
                guidance:
                    "Use the public guard rather than depending on the private marker string.",
            }
        case "Counts":
            return {
                input: "current lock state",
                operation: "readLocks / writeLocks",
                result: "total reads · writer count",
                invariant: "read count sums all fibers",
                implementation: "reader HashMap + optional writer tuple",
                guidance:
                    "Counts expose reentrancy depth, not a fairness queue or waiter count.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Acquire":
            return {
                input: "current fiber + lock",
                operation: "acquireRead(lock)",
                result: "this fiber's new read count",
                invariant: "other readers are allowed",
                implementation: "reader count in HashMap keyed by fiber id",
                guidance:
                    "Use for manual shared access when the release point must be controlled explicitly.",
            }
        case "Reentrant":
            return {
                input: "same fiber acquires twice",
                operation: "acquireRead × 2",
                result: "1 → 2",
                invariant: "ownership is reentrant per fiber",
                implementation: "increment existing reader count",
                guidance:
                    "Release the same number of times to fully relinquish read ownership.",
            }
        case "Concurrent":
            return {
                input: "multiple fibers without a writer",
                operation: "each acquireRead(lock)",
                result: "shared read ownership",
                invariant: "another writer blocks new readers",
                implementation:
                    "txRetry only when writer belongs to another fiber",
                guidance:
                    "Multiple readers may proceed concurrently; this is not a single-permit mutex.",
            }
        case "Release":
            return {
                input: "this fiber's read count",
                operation: "releaseRead(lock)",
                result: "remaining read count",
                invariant: "releasing unheld read returns 0",
                implementation: "decrement or remove reader entry",
                guidance:
                    "The final release removes that fiber from the reader map.",
            }
    }
}

export const write_snapshot = (model: Model): Snapshot => {
    switch (model.writeCase) {
        case "Exclusive":
            return {
                input: "lock with no conflicting owner",
                operation: "acquireWrite(lock)",
                result: "write count 1",
                invariant: "other readers/writers must be absent",
                implementation: "optional [fiberId, count] writer tuple",
                guidance:
                    "Use for exclusive mutation of the protected invariant.",
            }
        case "Reentrant":
            return {
                input: "writer reacquires from same fiber",
                operation: "acquireWrite(lock)",
                result: "write count increments",
                invariant: "same writer never blocks itself",
                implementation: "increment writer tuple count",
                guidance:
                    "Nested exclusive sections are supported, but every acquisition still needs a release.",
            }
        case "Upgrade":
            return {
                input: "this fiber owns read lock(s)",
                operation: "acquireWrite(lock)",
                result: "write lock if no other readers",
                invariant: "own reads do not block upgrade",
                implementation:
                    "scan reader ids; retry on any other positive count",
                guidance:
                    "Upgrade is safe only when this fiber is the sole reader; other readers cause transactional retry.",
            }
        case "Release":
            return {
                input: "current writer count",
                operation: "releaseWrite(lock)",
                result: "remaining write count",
                invariant: "writer cleared when count reaches zero",
                implementation: "decrement writer tuple or set None",
                guidance:
                    "Releasing from a non-owner returns 0 and leaves the actual owner unchanged.",
            }
    }
}

export const scope_snapshot = (model: Model): Snapshot => {
    switch (model.scopeCase) {
        case "ReadLock":
            return {
                input: "Scope + lock",
                operation: "TxReentrantLock.readLock(lock)",
                result: "scoped read ownership",
                invariant:
                    "scope close releases the captured fiber's read count",
                implementation:
                    "Effect.acquireRelease(acquireRead, releaseReadFor)",
                guidance:
                    "Use when several effects in one Scope need shared access.",
            }
        case "WriteLock":
            return {
                input: "Scope + lock",
                operation: "TxReentrantLock.writeLock(lock)",
                result: "scoped exclusive ownership",
                invariant: "scope close releases one write acquisition",
                implementation:
                    "Effect.acquireRelease(acquireWrite, releaseWriteFor)",
                guidance:
                    "Use for exclusive ownership whose lifetime naturally matches a Scope.",
            }
        case "Wrapper":
            return {
                input: "lock + Effect<A, E, R>",
                operation: "withReadLock / withWriteLock",
                result: "same effect result",
                invariant: "release follows use",
                implementation: "Effect.acquireUseRelease",
                guidance:
                    "This is the simplest shape for protecting one effectful critical section.",
            }
        case "AutoRelease":
            return {
                input: "success, failure, or interruption",
                operation: "wrapper finalizer",
                result: "lock acquisition released",
                invariant: "release runs after the protected effect exits",
                implementation: "acquire/use/release bracket",
                guidance:
                    "Prefer this over hand-written finally logic so exceptional exits do not strand ownership.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Read":
            return read_snapshot(model)
        case "Write":
            return write_snapshot(model)
        case "Scope":
            return scope_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    readCase: "Acquire",
    writeCase: "Exclusive",
    scopeCase: "Wrapper",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxReentrantLockStage: { stage: Stage },
    SelectedTxReentrantLockCreateCase: { createCase: CreateCase },
    SelectedTxReentrantLockReadCase: { readCase: ReadCase },
    SelectedTxReentrantLockWriteCase: { writeCase: WriteCase },
    SelectedTxReentrantLockScopeCase: { scopeCase: ScopeCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type WriteCasePayload = Readonly<{ writeCase: WriteCase }>
type ScopeCasePayload = Readonly<{ scopeCase: ScopeCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxReentrantLockStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTxReentrantLockCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTxReentrantLockReadCase: ({ readCase }: ReadCasePayload) => ({
            model: evo(model, { readCase: () => readCase }),
        }),
        SelectedTxReentrantLockWriteCase: ({
            writeCase,
        }: WriteCasePayload) => ({
            model: evo(model, { writeCase: () => writeCase }),
        }),
        SelectedTxReentrantLockScopeCase: ({
            scopeCase,
        }: ScopeCasePayload) => ({
            model: evo(model, { scopeCase: () => scopeCase }),
        }),
    })
