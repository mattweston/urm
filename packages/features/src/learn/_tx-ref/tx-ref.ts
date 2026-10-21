import { Effect, Schema as S, TxRef } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXREF PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const ref = yield* TxRef.make(10)
    return yield* TxRef.get(ref)
})

export const unsafe_program = Effect.gen(function* () {
    const ref = TxRef.makeUnsafe({ count: 1 })
    return yield* TxRef.get(ref)
})

export const update_program = Effect.gen(function* () {
    const ref = yield* TxRef.make(10)
    yield* TxRef.update(ref, (current: number) => current * 2)
    return yield* TxRef.get(ref)
})

export const modify_program = Effect.gen(function* () {
    const ref = yield* TxRef.make(10)
    const previous = yield* TxRef.modify(ref, (current: number) => [
        current,
        current + 5,
    ])
    const current = yield* TxRef.get(ref)
    return [previous, current] as const
})

export const compose_program = Effect.gen(function* () {
    const debit = yield* TxRef.make(100)
    const credit = yield* TxRef.make(25)

    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxRef.update(debit, (n: number) => n - 10)
            yield* TxRef.update(credit, (n: number) => n + 10)
        })
    )

    return [yield* TxRef.get(debit), yield* TxRef.get(credit)] as const
})

export const rollback_program = Effect.gen(function* () {
    const ref = yield* TxRef.make(10)

    yield* Effect.exit(
        Effect.tx(
            Effect.gen(function* () {
                yield* TxRef.set(ref, 99)
                return yield* Effect.fail("rollback")
            })
        )
    )

    return yield* TxRef.get(ref)
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Read"),
    S.Literal("Update"),
    S.Literal("Compose"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Read",
    "Update",
    "Compose",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Unsafe"),
    S.Literal("Shape"),
    S.Literal("Identity"),
])
export type CreateCase = typeof CreateCase.Type
export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Unsafe",
    "Shape",
    "Identity",
]

export const ReadCase = S.Union([
    S.Literal("Get"),
    S.Literal("Journal"),
    S.Literal("Repeat"),
    S.Literal("Conflict"),
])
export type ReadCase = typeof ReadCase.Type
export const read_cases: ReadonlyArray<ReadCase> = [
    "Get",
    "Journal",
    "Repeat",
    "Conflict",
]

export const UpdateCase = S.Union([
    S.Literal("Set"),
    S.Literal("Update"),
    S.Literal("Modify"),
    S.Literal("Result"),
])
export type UpdateCase = typeof UpdateCase.Type
export const update_cases: ReadonlyArray<UpdateCase> = [
    "Set",
    "Update",
    "Modify",
    "Result",
]

export const ComposeCase = S.Union([
    S.Literal("Atomic"),
    S.Literal("Rollback"),
    S.Literal("Retry"),
    S.Literal("Outermost"),
])
export type ComposeCase = typeof ComposeCase.Type
export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Atomic",
    "Rollback",
    "Retry",
    "Outermost",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    readCase: ReadCase,
    updateCase: UpdateCase,
    composeCase: ComposeCase,
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
            "Transactional state begins as one value plus transaction bookkeeping",
        title: "Create a transactional reference",
        description:
            "TxRef.make creates a reference inside Effect, while makeUnsafe constructs one synchronously. The live value is runtime transaction state, not serializable application model data.",
        code: `const ref = yield* TxRef.make(10)\n\nconst unsafe = TxRef.makeUnsafe({ count: 1 })`,
        apis: ["TxRef.make", "TxRef.makeUnsafe", "TxRef.TxRef"],
        notice: "TxRef is the primitive behind Effect's transactional collections. It carries the live value plus version and pending-retry bookkeeping.",
    },
    Read: {
        eyebrow: "Reads participate in the same transaction journal as writes",
        title: "Read the transaction's current view",
        description:
            "TxRef.get is implemented through modify, so a read records the reference in the transaction journal and sees prior writes made by that same transaction before commit.",
        code: `const value = yield* Effect.tx(\n    TxRef.get(ref)\n)\n\n// repeated reads in the same tx see the journal value`,
        apis: ["TxRef.get", "Effect.tx", "Effect.Transaction"],
        notice: "A transactional read is not just ref.value. It joins the journal so conflict detection, retry, and atomic commit work across the whole transaction.",
    },
    Update: {
        eyebrow: "set and update are convenience forms of modify",
        title: "Replace, transform, or return a separate result",
        description:
            "set replaces the value, update derives the next value, and modify atomically computes both a return value and the next stored value from one journal snapshot.",
        code: `const previous = yield* TxRef.modify(\n    ref,\n    (current) => [current, current + 5]\n)\n\n// previous is returned; current + 5 becomes the new value`,
        apis: ["TxRef.set", "TxRef.update", "TxRef.modify"],
        notice: "Use modify when the returned result must correspond exactly to the same transactional state used to compute the next value.",
    },
    Compose: {
        eyebrow:
            "Several refs can commit as one all-or-nothing state transition",
        title: "Compose references inside one outer transaction",
        description:
            "Effect.tx journals every touched TxRef. The outermost transaction validates and commits them together; failure leaves live values unchanged, while txRetry waits for a touched reference to change before re-running.",
        code: `yield* Effect.tx(Effect.gen(function*() {\n    yield* TxRef.update(debit, (n: number) => n - 10)\n    yield* TxRef.update(credit, (n: number) => n + 10)\n}))`,
        apis: ["Effect.tx", "Effect.txRetry", "TxRef.get", "TxRef.update"],
        notice: "Atomicity belongs to the outer transaction. Individual TxRef helpers are transactional already, but wrap a multi-ref invariant in one Effect.tx so the whole invariant commits together.",
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
                input: "initial value 10",
                operation: "yield* TxRef.make(10)",
                result: "TxRef<number>",
                invariant: "fresh value · version 0",
                implementation: "Effect.sync(() => makeUnsafe(initial))",
                guidance:
                    "Use make inside Effect programs so construction stays in the effect boundary.",
            }
        case "Unsafe":
            return {
                input: "plain initial value",
                operation: "TxRef.makeUnsafe(value)",
                result: "TxRef immediately",
                invariant: "synchronous construction",
                implementation: "value + version + pending map",
                guidance:
                    "Use makeUnsafe only when synchronous construction is intentional and controlled.",
            }
        case "Shape":
            return {
                input: "TxRef<A>",
                operation: "inspect public model",
                result: "Pipeable transactional ref",
                invariant: "value is runtime state",
                implementation: "value · version · pending",
                guidance:
                    "Treat internals as implementation detail; use get/set/update/modify for transactions.",
            }
        case "Identity":
            return {
                input: "workspace rc.112 → live rc.115",
                operation: "compare source",
                result: "same 7-name API",
                invariant: "behavior unchanged",
                implementation: "only private TypeId renamed",
                guidance: "Do not hard-code the private runtime marker string.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Get":
            return {
                input: "TxRef value = 42",
                operation: "yield* TxRef.get(ref)",
                result: "42",
                invariant: "read participates transactionally",
                implementation: "get = modify(current => [current, current])",
                guidance:
                    "Use get for both single reads and reads inside larger Effect.tx blocks.",
            }
        case "Journal":
            return {
                input: "ref first touched in tx",
                operation: "journal.set(ref, snapshot)",
                result: "transaction-local entry",
                invariant: "same tx reuses journal entry",
                implementation: "version + value snapshot",
                guidance:
                    "Journal state lets later operations observe earlier writes before anything is committed live.",
            }
        case "Repeat":
            return {
                input: "set(ref, 5) then get(ref)",
                operation: "same outer transaction",
                result: "get sees 5",
                invariant: "read-your-own-writes",
                implementation: "shared journal value",
                guidance:
                    "Transactions provide a coherent local view even before the final commit.",
            }
        case "Conflict":
            return {
                input: "another commit changes a touched ref",
                operation: "outer transaction validates version",
                result: "retry instead of partial commit",
                invariant: "conflicting snapshot is rejected",
                implementation: "TxRef.version conflict detection",
                guidance:
                    "Keep side effects outside transactional callbacks; transaction bodies may be re-run.",
            }
    }
}

export const update_snapshot = (model: Model): Snapshot => {
    switch (model.updateCase) {
        case "Set":
            return {
                input: "current = 10",
                operation: "TxRef.set(ref, 100)",
                result: "current = 100",
                invariant: "replacement is journaled",
                implementation: "update(() => value)",
                guidance:
                    "Use set when the next value does not depend on the current value.",
            }
        case "Update":
            return {
                input: "current = 10",
                operation: "TxRef.update(ref, n => n * 2)",
                result: "current = 20",
                invariant: "one current snapshot drives update",
                implementation: "modify → void result + next value",
                guidance:
                    "Use update for pure read-modify-write when you do not need a separate result.",
            }
        case "Modify":
            return {
                input: "current = 10",
                operation: "modify(ref, n => [n, n + 5])",
                result: "returns 10 · stores 15",
                invariant: "result and next value share one snapshot",
                implementation: "[returnValue, newValue]",
                guidance:
                    "Use modify for dequeue/counter-style operations where you need both output and mutation.",
            }
        case "Result":
            return {
                input: "domain state",
                operation: "modify computes decision + state",
                result: "decision returned transactionally",
                invariant: "no second read is required",
                implementation: "single journal mutation",
                guidance:
                    "Return the domain result directly from modify instead of reading the ref again afterward.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Atomic":
            return {
                input: "debit 100 · credit 25",
                operation: "one Effect.tx transfer",
                result: "90 · 35",
                invariant: "both refs commit together",
                implementation: "one shared transaction journal",
                guidance:
                    "Group every ref participating in one invariant inside the same outer Effect.tx.",
            }
        case "Rollback":
            return {
                input: "set 99 then fail",
                operation: "Effect.tx(...failure...)",
                result: "live value stays 10",
                invariant: "failed transaction does not commit",
                implementation: "journal discarded on failure",
                guidance:
                    "A failure can abort a speculative state transition without manual undo logic.",
            }
        case "Retry":
            return {
                input: "condition not yet satisfied",
                operation: "yield* Effect.txRetry",
                result: "wait + re-run after touched ref changes",
                invariant: "retry is transaction-aware",
                implementation: "pending watchers on accessed refs",
                guidance:
                    "Use txRetry for transactional conditions rather than polling mutable state manually.",
            }
        case "Outermost":
            return {
                input: "nested transactional helpers",
                operation: "outer Effect.tx governs commit",
                result: "one atomic boundary",
                invariant: "inner helpers join current transaction",
                implementation: "Effect.Transaction journal",
                guidance:
                    "Individual helpers call tx internally; nesting them inside an outer tx composes rather than partially committing.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxRefStage: { stage: Stage },
    SelectedTxRefCreateCase: { createCase: CreateCase },
    SelectedTxRefReadCase: { readCase: ReadCase },
    SelectedTxRefUpdateCase: { updateCase: UpdateCase },
    SelectedTxRefComposeCase: { composeCase: ComposeCase },
})
export type Message = typeof Message.Type

export const init: Model = {
    stage: "Create",
    createCase: "Make",
    readCase: "Get",
    updateCase: "Modify",
    composeCase: "Atomic",
}

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type UpdateCasePayload = Readonly<{ updateCase: UpdateCase }>
type ComposeCasePayload = Readonly<{ composeCase: ComposeCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxRefStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxRefCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxRefReadCase: ({ readCase }: ReadCasePayload) => ({
            model: modifyFields(model, { readCase: () => readCase }),
        }),
        SelectedTxRefUpdateCase: ({ updateCase }: UpdateCasePayload) => ({
            model: modifyFields(model, { updateCase: () => updateCase }),
        }),
        SelectedTxRefComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: modifyFields(model, { composeCase: () => composeCase }),
        }),
    })
