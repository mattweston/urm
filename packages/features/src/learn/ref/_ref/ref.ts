import { Effect, Option, Ref, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REF PROGRAMS
// -----------------------------------------------------------------------------

export const basic_counter_program = Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    const before = yield* Ref.get(counter)

    yield* Ref.update(counter, (value: number): number => value + 1)

    const after = yield* Ref.get(counter)

    return {
        before,
        after,
    } as const
})

export const unsafe_counter = Ref.makeUnsafe(7)
export const unsafe_counter_value = Ref.getUnsafe(unsafe_counter)

export const exchange_program = Effect.gen(function* () {
    const ref = yield* Ref.make("draft")

    const previous = yield* Ref.getAndSet(ref, "review")
    const currentFromSet = yield* Ref.setAndGet(ref, "published")
    const current = yield* Ref.get(ref)

    return {
        previous,
        currentFromSet,
        current,
    } as const
})

export const transform_program = Effect.gen(function* () {
    const counter = yield* Ref.make(10)

    const previous = yield* Ref.getAndUpdate(
        counter,
        (value: number): number => value * 2
    )

    const current = yield* Ref.updateAndGet(
        counter,
        (value: number): number => value + 5
    )

    const label = yield* Ref.modify(
        counter,
        (value: number): readonly [string, number] => [
            `stored ${String(value)}`,
            value + 1,
        ]
    )

    const finalValue = yield* Ref.get(counter)

    return {
        previous,
        current,
        label,
        finalValue,
    } as const
})

export const conditional_program = Effect.gen(function* () {
    const counter = yield* Ref.make(5)

    yield* Ref.updateSome(
        counter,
        (value: number): Option.Option<number> =>
            value % 2 === 0 ? Option.some(value * 2) : Option.none()
    )

    const skipped = yield* Ref.get(counter)

    const previous = yield* Ref.getAndUpdateSome(
        counter,
        (value: number): Option.Option<number> =>
            value >= 5 ? Option.some(value + 5) : Option.none()
    )

    const current = yield* Ref.updateSomeAndGet(
        counter,
        (value: number): Option.Option<number> =>
            value > 20 ? Option.none() : Option.some(value * 2)
    )

    const note = yield* Ref.modifySome(
        counter,
        (value: number): readonly [string, Option.Option<number>] =>
            value >= 20
                ? ["cap reached", Option.none()]
                : ["incremented", Option.some(value + 1)]
    )

    const finalValue = yield* Ref.get(counter)

    return {
        skipped,
        previous,
        current,
        note,
        finalValue,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Exchange"),
    S.Literal("Transform"),
    S.Literal("Conditional"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Exchange",
    "Transform",
    "Conditional",
]

export const CreateCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Unsafe"),
    S.Literal("Model"),
    S.Literal("Boundary"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Effect",
    "Unsafe",
    "Model",
    "Boundary",
]

export const ExchangeCase = S.Union([
    S.Literal("Read"),
    S.Literal("Set"),
    S.Literal("Previous"),
    S.Literal("Current"),
])
export type ExchangeCase = typeof ExchangeCase.Type

export const exchange_cases: ReadonlyArray<ExchangeCase> = [
    "Read",
    "Set",
    "Previous",
    "Current",
]

export const TransformCase = S.Union([
    S.Literal("Update"),
    S.Literal("Previous"),
    S.Literal("Current"),
    S.Literal("Modify"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Update",
    "Previous",
    "Current",
    "Modify",
]

export const ConditionalCase = S.Union([
    S.Literal("Apply"),
    S.Literal("Skip"),
    S.Literal("Previous"),
    S.Literal("Modify"),
])
export type ConditionalCase = typeof ConditionalCase.Type

export const conditional_cases: ReadonlyArray<ConditionalCase> = [
    "Apply",
    "Skip",
    "Previous",
    "Modify",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    exchangeCase: ExchangeCase,
    transformCase: TransformCase,
    conditionalCase: ConditionalCase,
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
            "fiber-safe mutable state whose normal API stays inside Effect",
        title: "Create shared state at the runtime boundary",
        description:
            "Ref.make wraps construction in Effect, while makeUnsafe creates the same Ref synchronously for trusted low-level boundaries. Safe reads and writes remain Effect values so Ref state composes with the runtime and concurrency model.",
        code: `const program =
    Effect.gen(function* () {
        const counter =
            yield* Ref.make(0)

        const before =
            yield* Ref.get(counter)

        yield* Ref.update(
            counter,
            (n) => n + 1
        )

        return [
            before,
            yield* Ref.get(counter),
        ]
    })`,
        apis: [
            "Ref.Ref",
            "Ref.make",
            "Ref.makeUnsafe",
            "Ref.get",
            "Ref.getUnsafe",
        ],
        notice: "Prefer make/get in Effect programs. The unsafe constructors and getters are synchronous escape hatches, not faster everyday alternatives. Keep Ref objects out of a pure serializable Foldkit Model; own them in the runtime or a service instead.",
    },

    Exchange: {
        eyebrow:
            "read or replace one value atomically—and choose which side to return",
        title: "Distinguish plain set from previous/current exchange helpers",
        description:
            "get reads without changing state. set replaces without returning a value. getAndSet returns the old value, while setAndGet returns the newly stored value. Those names encode which side of the atomic replacement becomes the Effect result.",
        code: `const ref =
    yield* Ref.make("draft")

const previous =
    yield* Ref.getAndSet(
        ref,
        "review"
    )
// "draft"

const current =
    yield* Ref.setAndGet(
        ref,
        "published"
    )
// "published"`,
        apis: ["Ref.get", "Ref.set", "Ref.getAndSet", "Ref.setAndGet"],
        notice: "Use the helper whose return value you actually need. Splitting a read and write into separate operations is not the same atomic exchange when multiple fibers share the Ref.",
    },

    Transform: {
        eyebrow:
            "derive the next state from the current state in one synchronous atomic step",
        title: "Choose update, previous/current update, or full modify",
        description:
            "update stores the callback result and returns void. getAndUpdate returns the previous value. updateAndGet returns the new value. modify is the general form: its callback returns [result, nextState], so the Effect result can differ from the value stored in the Ref.",
        code: `const counter =
    yield* Ref.make(10)

const previous =
    yield* Ref.getAndUpdate(
        counter,
        (n) => n * 2
    )
// 10 · stored 20

const label =
    yield* Ref.modify(
        counter,
        (n) => [
            \`was \${n}\`,
            n + 1,
        ]
    )`,
        apis: [
            "Ref.update",
            "Ref.getAndUpdate",
            "Ref.updateAndGet",
            "Ref.modify",
        ],
        notice: "The transformation callback is synchronous. Keep it small and non-effectful so the read/derive/write sequence stays one atomic Ref operation. Reach for SynchronizedRef when the state transition itself must run effects.",
    },

    Conditional: {
        eyebrow:
            "Option.some stores a new value · Option.none keeps the current value",
        title: "Make updates conditional without leaving the atomic operation",
        description:
            "The *Some family lets the callback decline an update. updateSome returns void, updateSomeAndGet returns the resulting current value, getAndUpdateSome always returns the previous value, and modifySome combines an arbitrary result with an optional next state.",
        code: `yield* Ref.updateSome(
    counter,
    (n) =>
        n % 2 === 0
            ? Option.some(n * 2)
            : Option.none()
)

const result =
    yield* Ref.modifySome(
        counter,
        (n) => [
            n >= 20
                ? "cap reached"
                : "incremented",
            n >= 20
                ? Option.none()
                : Option.some(n + 1),
        ]
    )`,
        apis: [
            "Ref.updateSome",
            "Ref.updateSomeAndGet",
            "Ref.getAndUpdateSome",
            "Ref.modifySome",
            "Option.some",
            "Option.none",
        ],
        notice: "Option.none means ‘leave the stored value unchanged’; it is not an Effect failure. The return-value rule still applies: getAndUpdateSome returns the old value even when no update occurs, while updateSomeAndGet returns the resulting current value.",
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
        case "Effect":
            return {
                input: "yield* Ref.make(0)",
                operation: "allocate Ref inside Effect",
                result: "Ref<number>",
                invariant:
                    "normal construction participates in the Effect program",
                implementation: "make = Effect.sync(() => makeUnsafe(value))",
                guidance:
                    "Prefer Ref.make when the reference belongs to Effect-managed runtime state.",
            }

        case "Unsafe":
            return {
                input: "Ref.makeUnsafe(7)",
                operation: "Ref.getUnsafe(ref)",
                result: String(unsafe_counter_value),
                invariant: "synchronous access bypasses the Effect wrapper",
                implementation: "the same underlying Ref model is used",
                guidance:
                    "Reserve unsafe access for trusted synchronous integration boundaries.",
            }

        case "Model":
            return {
                input: "Ref<A>",
                operation: "hold one mutable A",
                result: "effectful read/write/atomic transforms",
                invariant:
                    "A is invariant because the Ref is both read and written",
                implementation: "Ref wraps a MutableRef internally",
                guidance:
                    "Share the Ref itself when multiple fibers intentionally coordinate through one state cell.",
            }

        case "Boundary":
            return {
                input: "Foldkit Model / update",
                operation: "runtime owns Ref; messages carry plain data",
                result: "pure UI state + effectful runtime state",
                invariant: "do not serialize a live Ref into view state",
                implementation:
                    "keep Ref in services, handlers, or runtime integration",
                guidance:
                    "Use Foldkit Model for feature-visible state; use Ref for shared runtime state that genuinely needs mutation.",
            }
    }
}

export const exchange_snapshot = (model: Model): Snapshot => {
    switch (model.exchangeCase) {
        case "Read":
            return {
                input: "Ref contains 42",
                operation: "yield* Ref.get(ref)",
                result: "42 · stored value unchanged",
                invariant: "read is effectful but non-mutating",
                implementation:
                    "Effect.sync reads the current underlying value",
                guidance: "Use get for normal reads inside Effect code.",
            }

        case "Set":
            return {
                input: "Ref contains 10",
                operation: "yield* Ref.set(ref, 42)",
                result: "void · stored 42",
                invariant: "known replacement, no returned state value",
                implementation: "set is dual: data-first or piped/data-last",
                guidance:
                    "Use set when the replacement value is already known and no exchange result is needed.",
            }

        case "Previous":
            return {
                input: '"draft" → getAndSet("review")',
                operation: "replace atomically and return old value",
                result: 'returns "draft" · stores "review"',
                invariant: "read + write is one Ref operation",
                implementation:
                    "capture current, assign next, return captured value",
                guidance:
                    "Use getAndSet when downstream logic needs to know what was replaced.",
            }

        case "Current":
            return {
                input: '"review" → setAndGet("published")',
                operation: "replace atomically and return new value",
                result: 'returns "published" · stores "published"',
                invariant: "Effect result equals the new stored value",
                implementation:
                    "assignment expression becomes the returned value",
                guidance:
                    "Use setAndGet when the caller needs the canonical value after the replacement.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Update":
            return {
                input: "5",
                operation: "Ref.update(ref, n => n * 2)",
                result: "void · stored 10",
                invariant: "callback derives next state from current state",
                implementation:
                    "one synchronous read/transform/write operation",
                guidance:
                    "Use update for the common case where only the new stored state matters.",
            }

        case "Previous":
            return {
                input: "10",
                operation: "getAndUpdate(ref, n => n * 2)",
                result: "returns 10 · stores 20",
                invariant: "return previous, store derived next",
                implementation:
                    "current is captured before applying the callback",
                guidance:
                    "Choose getAndUpdate when you need the pre-transition state as the result.",
            }

        case "Current":
            return {
                input: "20",
                operation: "updateAndGet(ref, n => n + 5)",
                result: "returns 25 · stores 25",
                invariant: "return the derived next state",
                implementation: "assignment result is returned from the effect",
                guidance:
                    "Choose updateAndGet when subsequent work needs the committed new state.",
            }

        case "Modify":
            return {
                input: "25",
                operation: "modify(ref, n => [`stored ${n}`, n + 1])",
                result: 'returns "stored 25" · stores 26',
                invariant: "Effect result B is independent of stored state A",
                implementation: "callback returns readonly [B, A]",
                guidance:
                    "Use modify as the general atomic primitive when the return value is not simply old or new state.",
            }
    }
}

export const conditional_snapshot = (model: Model): Snapshot => {
    switch (model.conditionalCase) {
        case "Apply":
            return {
                input: "Ref contains 6",
                operation: "updateSome(ref, n => Option.some(n * 2))",
                result: "void · stored 12",
                invariant: "Some(next) authorizes the update",
                implementation:
                    "Option tag is checked inside the atomic operation",
                guidance:
                    "Return Some only when the current state satisfies your update condition.",
            }

        case "Skip":
            return {
                input: "Ref contains 5",
                operation: "updateSome(ref, _ => Option.none())",
                result: "void · still stores 5",
                invariant: "None is a no-op, not a failure",
                implementation:
                    "the existing underlying value is left untouched",
                guidance:
                    "Use conditional helpers instead of reading first and deciding to update in a second operation.",
            }

        case "Previous":
            return {
                input: "Ref contains 10",
                operation: "getAndUpdateSome(ref, _ => Option.none())",
                result: "returns 10 · still stores 10",
                invariant:
                    "previous value is returned whether the update applies or skips",
                implementation:
                    "current is captured before Option is inspected",
                guidance:
                    "Do not infer from the return value alone whether a conditional update occurred.",
            }

        case "Modify":
            return {
                input: "Ref contains 20",
                operation:
                    'modifySome(ref, n => ["cap reached", Option.none()])',
                result: 'returns "cap reached" · still stores 20',
                invariant:
                    "result can explain a skipped update without changing state",
                implementation:
                    "None is translated back to the existing state inside modify",
                guidance:
                    "Use modifySome when you need both a decision/result and an optional state transition atomically.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRefStage: {
        stage: Stage,
    },
    SelectedRefCreateCase: {
        createCase: CreateCase,
    },
    SelectedRefExchangeCase: {
        exchangeCase: ExchangeCase,
    },
    SelectedRefTransformCase: {
        transformCase: TransformCase,
    },
    SelectedRefConditionalCase: {
        conditionalCase: ConditionalCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Effect",
    exchangeCase: "Previous",
    transformCase: "Modify",
    conditionalCase: "Skip",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type ExchangeCasePayload = Readonly<{
    exchangeCase: ExchangeCase
}>

type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>

type ConditionalCasePayload = Readonly<{
    conditionalCase: ConditionalCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRefStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedRefCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedRefExchangeCase: ({ exchangeCase }: ExchangeCasePayload) => ({
            model: evo(model, {
                exchangeCase: () => exchangeCase,
            }),
        }),

        SelectedRefTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, {
                transformCase: () => transformCase,
            }),
        }),

        SelectedRefConditionalCase: ({
            conditionalCase,
        }: ConditionalCasePayload) => ({
            model: evo(model, {
                conditionalCase: () => conditionalCase,
            }),
        }),
    })
