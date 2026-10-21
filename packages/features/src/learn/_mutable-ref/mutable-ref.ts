import { Equal, Hash, MutableRef, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN VALUE FOR COMPARE-AND-SET
// -----------------------------------------------------------------------------

export class Version implements Equal.Equal {
    constructor(readonly value: number) {}

    [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof Version && this.value === that.value
    }

    [Hash.symbol](): number {
        return Hash.string(String(this.value))
    }

    toString(): string {
        return `Version(${this.value})`
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Update"),
    S.Literal("Numeric"),
    S.Literal("Compare"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Update",
    "Numeric",
    "Compare",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Current"),
    S.Literal("GetSet"),
])
export type CreateCase = typeof CreateCase.Type

export const UpdateCase = S.Union([
    S.Literal("Set"),
    S.Literal("OldValue"),
    S.Literal("NewValue"),
])
export type UpdateCase = typeof UpdateCase.Type

export const NumericCase = S.Union([
    S.Literal("Increment"),
    S.Literal("Decrement"),
    S.Literal("Toggle"),
])
export type NumericCase = typeof NumericCase.Type

export const CompareCase = S.Union([
    S.Literal("Match"),
    S.Literal("Miss"),
    S.Literal("Structural"),
])
export type CompareCase = typeof CompareCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    updateCase: UpdateCase,
    numericCase: NumericCase,
    compareCase: CompareCase,
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
        eyebrow: "one synchronous mutable value",
        title: "Create a stable reference, read current directly, or use pipe-friendly helpers",
        description:
            "MutableRef stores one synchronous mutable value in the same reference object. make creates it, .current exposes direct mutable access, get reads through a helper, and set replaces the value while returning the same ref.",
        code: `const ref =
    MutableRef.make(
        10
    )

ref.current
// 10

ref.current = 20

MutableRef.get(
    ref
)
// 20

const same =
    MutableRef.set(
        ref,
        30
    )

same === ref
// true`,
        apis: [
            "MutableRef.MutableRef",
            "MutableRef.make",
            "MutableRef.get",
            "MutableRef.set",
        ],
        notice: "MutableRef is synchronous local mutable state. Unlike Effect Ref, these helpers are not Effect values and do not require yielding or a runtime to execute.",
    },

    Update: {
        eyebrow: "choose the value you want returned",
        title: "Set or transform in place, then choose whether the helper returns the ref, old value, or new value",
        description:
            "The API mirrors pre/post assignment patterns. set and update return the same MutableRef; getAndSet and getAndUpdate return the previous value; setAndGet and updateAndGet return the replacement value.",
        code: `const ref =
    MutableRef.make(
        5
    )

MutableRef.set(
    ref,
    10
)
// returns ref

MutableRef.getAndSet(
    ref,
    20
)
// returns 10

MutableRef.setAndGet(
    ref,
    30
)
// returns 30

MutableRef.getAndUpdate(
    ref,
    (
        value: number
    ) =>
        value * 2
)
// returns 30

MutableRef.updateAndGet(
    ref,
    (
        value: number
    ) =>
        value + 1
)
// returns 61`,
        apis: [
            "MutableRef.set",
            "MutableRef.setAndGet",
            "MutableRef.getAndSet",
            "MutableRef.update",
            "MutableRef.updateAndGet",
            "MutableRef.getAndUpdate",
        ],
        notice: "The naming is literal: getAndX returns the old value, XAndGet returns the new value, while plain set / update return the MutableRef itself.",
    },

    Numeric: {
        eyebrow: "specialized synchronous helpers",
        title: "Use pre/post-style increment and decrement helpers, plus boolean toggle",
        description:
            "Numeric MutableRefs have helpers for in-place increment and decrement. The plain forms return the ref, getAnd* returns the previous number, and *AndGet returns the updated number. toggle flips a boolean and returns the same ref.",
        code: `const count =
    MutableRef.make(
        5
    )

MutableRef.getAndIncrement(
    count
)
// 5, ref now 6

MutableRef.incrementAndGet(
    count
)
// 7

MutableRef.decrement(
    count
)
// returns ref, value 6

MutableRef.decrementAndGet(
    count
)
// 5

const flag =
    MutableRef.make(
        false
    )

MutableRef.toggle(
    flag
)

MutableRef.get(
    flag
)
// true`,
        apis: [
            "MutableRef.increment",
            "MutableRef.incrementAndGet",
            "MutableRef.getAndIncrement",
            "MutableRef.decrement",
            "MutableRef.decrementAndGet",
            "MutableRef.getAndDecrement",
            "MutableRef.toggle",
        ],
        notice: "getAndIncrement / getAndDecrement behave like post-increment or post-decrement; incrementAndGet / decrementAndGet behave like pre-increment or pre-decrement.",
    },

    Compare: {
        eyebrow: "conditional replacement",
        title: "compareAndSet changes the value only when the current value equals the expected value",
        description:
            "compareAndSet returns true when it replaces the current value and false when the expected value does not match. Matching uses Effect Equal.equals rather than only JavaScript reference identity.",
        code: `const ref =
    MutableRef.make(
        new Version(
            1
        )
    )

MutableRef.compareAndSet(
    ref,
    new Version(
        1
    ),
    new Version(
        2
    )
)
// true

MutableRef.get(
    ref
)
// Version(2)

MutableRef.compareAndSet(
    ref,
    new Version(
        1
    ),
    new Version(
        3
    )
)
// false`,
        apis: [
            "MutableRef.compareAndSet",
            "Equal.equals",
            "Equal.Equal",
            "Hash.symbol",
        ],
        notice: "The expected value can be a distinct object that is Equal to the current value. For custom Equal types, preserve the usual Equal / Hash contract and keep hashed identity stable.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    initial: number
    directRead: number
    directWrite: number
    helperRead: number
    sameReference: boolean
    final: number
}>

export const create_snapshot = (model: Model): CreateSnapshot => {
    const ref = MutableRef.make(10)

    const initial = ref.current

    const directRead = ref.current

    ref.current = 20

    const directWrite = ref.current

    const helperRead = MutableRef.get(ref)

    const returned = MutableRef.set(ref, 30)

    return {
        mode: model.createCase,
        initial,
        directRead,
        directWrite,
        helperRead,
        sameReference: returned === ref,
        final: MutableRef.get(ref),
    }
}

export type UpdateSnapshot = Readonly<{
    mode: UpdateCase
    start: number
    setReturnsRef: boolean
    afterSet: number
    getAndSetOld: number
    setAndGetNew: number
    getAndUpdateOld: number
    updateAndGetNew: number
    final: number
}>

export const update_snapshot = (model: Model): UpdateSnapshot => {
    const ref = MutableRef.make(5)

    const returned = MutableRef.set(ref, 10)

    const getAndSetOld = MutableRef.getAndSet(ref, 20)

    const setAndGetNew = MutableRef.setAndGet(ref, 30)

    const getAndUpdateOld = MutableRef.getAndUpdate(
        ref,
        (value: number): number => value * 2
    )

    const updateAndGetNew = MutableRef.updateAndGet(
        ref,
        (value: number): number => value + 1
    )

    return {
        mode: model.updateCase,
        start: 5,
        setReturnsRef: returned === ref,
        afterSet: 10,
        getAndSetOld,
        setAndGetNew,
        getAndUpdateOld,
        updateAndGetNew,
        final: MutableRef.get(ref),
    }
}

export type NumericSnapshot = Readonly<{
    mode: NumericCase
    start: number
    postIncrementOld: number
    afterPostIncrement: number
    preIncrementNew: number
    postDecrementOld: number
    preDecrementNew: number
    incrementReturnsRef: boolean
    decrementReturnsRef: boolean
    toggleBefore: boolean
    toggleAfter: boolean
    toggleReturnsRef: boolean
}>

export const numeric_snapshot = (model: Model): NumericSnapshot => {
    const count = MutableRef.make(5)

    const postIncrementOld = MutableRef.getAndIncrement(count)

    const afterPostIncrement = MutableRef.get(count)

    const preIncrementNew = MutableRef.incrementAndGet(count)

    const postDecrementOld = MutableRef.getAndDecrement(count)

    const preDecrementNew = MutableRef.decrementAndGet(count)

    const incrementReturned = MutableRef.increment(count)

    const decrementReturned = MutableRef.decrement(count)

    const flag = MutableRef.make(false)

    const toggleBefore = MutableRef.get(flag)

    const toggleReturned = MutableRef.toggle(flag)

    return {
        mode: model.numericCase,
        start: 5,
        postIncrementOld,
        afterPostIncrement,
        preIncrementNew,
        postDecrementOld,
        preDecrementNew,
        incrementReturnsRef: incrementReturned === count,
        decrementReturnsRef: decrementReturned === count,
        toggleBefore,
        toggleAfter: MutableRef.get(flag),
        toggleReturnsRef: toggleReturned === flag,
    }
}

export type CompareSnapshot = Readonly<{
    mode: CompareCase
    distinctExpected: boolean
    equalExpected: boolean
    sameHash: boolean
    firstSucceeded: boolean
    afterFirst: string
    secondSucceeded: boolean
    afterSecond: string
    rule: string
}>

export const compare_snapshot = (model: Model): CompareSnapshot => {
    const current = new Version(1)

    const expected = new Version(1)

    const ref = MutableRef.make(current)

    const firstSucceeded = MutableRef.compareAndSet(
        ref,
        expected,
        new Version(2)
    )

    const afterFirst = String(MutableRef.get(ref))

    const secondSucceeded = MutableRef.compareAndSet(
        ref,
        new Version(1),
        new Version(3)
    )

    return {
        mode: model.compareCase,
        distinctExpected: current !== expected,
        equalExpected: Equal.equals(current, expected),
        sameHash: Hash.hash(current) === Hash.hash(expected),
        firstSucceeded,
        afterFirst,
        secondSucceeded,
        afterSecond: String(MutableRef.get(ref)),
        rule: "match current with Equal.equals(expected, current) before replacement",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedMutableRefStage: {
        stage: Stage,
    },
    SelectedMutableRefCreateCase: {
        createCase: CreateCase,
    },
    SelectedMutableRefUpdateCase: {
        updateCase: UpdateCase,
    },
    SelectedMutableRefNumericCase: {
        numericCase: NumericCase,
    },
    SelectedMutableRefCompareCase: {
        compareCase: CompareCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Make",
    updateCase: "Set",
    numericCase: "Increment",
    compareCase: "Match",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type UpdateCasePayload = Readonly<{
    updateCase: UpdateCase
}>

type NumericCasePayload = Readonly<{
    numericCase: NumericCase
}>

type CompareCasePayload = Readonly<{
    compareCase: CompareCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedMutableRefStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedMutableRefCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedMutableRefUpdateCase: ({ updateCase }: UpdateCasePayload) => ({
            model: evo(model, {
                updateCase: () => updateCase,
            }),
        }),

        SelectedMutableRefNumericCase: ({
            numericCase,
        }: NumericCasePayload) => ({
            model: evo(model, {
                numericCase: () => numericCase,
            }),
        }),

        SelectedMutableRefCompareCase: ({
            compareCase,
        }: CompareCasePayload) => ({
            model: evo(model, {
                compareCase: () => compareCase,
            }),
        }),
    })
