import {
    Number as NumberModule,
    Reducer,
    Schema as S,
    String as StringModule,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REDUCER PROGRAMS
// -----------------------------------------------------------------------------

export const Sum = Reducer.make<number>(
    (self: number, that: number): number => self + that,
    0
)

export const Concat = Reducer.make<string>(
    (self: string, that: string): string => self + that,
    ""
)

export const sum_empty = Sum.combineAll([])
export const sum_values = Sum.combineAll([2, 3, 5])
export const concat_values = Concat.combineAll(["Effect", " ", "Reducer"])

export type ProductProbe = Readonly<{
    result: number
    visited: number
    shortCircuited: boolean
}>

export const product_probe = (values: ReadonlyArray<number>): ProductProbe => {
    let visited = 0
    let shortCircuited = false

    const Product = Reducer.make<number>(
        (self: number, that: number): number => self * that,
        1,
        (collection: Iterable<number>): number => {
            let result = 1

            for (const value of collection) {
                visited += 1

                if (value === 0) {
                    shortCircuited = true
                    return 0
                }

                result *= value
            }

            return result
        }
    )

    return {
        result: Product.combineAll(values),
        visited,
        shortCircuited,
    }
}

export const builtin_examples = {
    sum: NumberModule.ReducerSum.combineAll([2, 3, 5]),
    product: NumberModule.ReducerMultiply.combineAll([2, 3, 4]),
    concat: StringModule.ReducerConcat.combineAll(["a", "b", "c"]),
} as const

export const Prepend = Reducer.flip(StringModule.ReducerConcat)

export const prepend_pair = Prepend.combine("a", "b")
export const prepend_all = Prepend.combineAll(["a", "b", "c"])

export type FlipProbe = Readonly<{
    baseResult: string
    flippedResult: string
    baseCustomCombineAllCalls: number
    flippedCustomCombineAllCalls: number
    sameInitialValue: boolean
}>

export const flip_probe = (): FlipProbe => {
    let customCombineAllCalls = 0

    const Base = Reducer.make<string>(
        (self: string, that: string): string => self + that,
        "",
        (collection: Iterable<string>): string => {
            customCombineAllCalls += 1
            return Array.from(collection).join("")
        }
    )

    const baseResult = Base.combineAll(["a", "b", "c"])
    const baseCustomCombineAllCalls = customCombineAllCalls

    customCombineAllCalls = 0

    const Flipped = Reducer.flip(Base)
    const flippedResult = Flipped.combineAll(["a", "b", "c"])

    return {
        baseResult,
        flippedResult,
        baseCustomCombineAllCalls,
        flippedCustomCombineAllCalls: customCombineAllCalls,
        sameInitialValue: Flipped.initialValue === Base.initialValue,
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Fold"),
    S.Literal("Optimize"),
    S.Literal("Flip"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Fold",
    "Optimize",
    "Flip",
]

export const BuildCase = S.Union([
    S.Literal("Interface"),
    S.Literal("Identity"),
    S.Literal("Custom"),
    S.Literal("BuiltIn"),
])
export type BuildCase = typeof BuildCase.Type

export const build_cases: ReadonlyArray<BuildCase> = [
    "Interface",
    "Identity",
    "Custom",
    "BuiltIn",
]

export const FoldCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Sequence"),
    S.Literal("Combine"),
    S.Literal("Iterable"),
])
export type FoldCase = typeof FoldCase.Type

export const fold_cases: ReadonlyArray<FoldCase> = [
    "Empty",
    "Sequence",
    "Combine",
    "Iterable",
]

export const OptimizeCase = S.Union([
    S.Literal("Default"),
    S.Literal("ShortCircuit"),
    S.Literal("Replace"),
    S.Literal("Semantics"),
])
export type OptimizeCase = typeof OptimizeCase.Type

export const optimize_cases: ReadonlyArray<OptimizeCase> = [
    "Default",
    "ShortCircuit",
    "Replace",
    "Semantics",
]

export const FlipCase = S.Union([
    S.Literal("Pair"),
    S.Literal("All"),
    S.Literal("Custom"),
    S.Literal("Identity"),
])
export type FlipCase = typeof FlipCase.Type

export const flip_cases: ReadonlyArray<FlipCase> = [
    "Pair",
    "All",
    "Custom",
    "Identity",
]

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    foldCase: FoldCase,
    optimizeCase: OptimizeCase,
    flipCase: FlipCase,
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
    Build: {
        eyebrow: "combiner + neutral starting value + whole-collection fold",
        title: "Package a reduction rule as a reusable value",
        description:
            "Reducer<A> extends Combiner.Combiner<A> with initialValue and combineAll. Reducer.make builds that reusable strategy from a binary combine function and a neutral starting value.",
        code: `const Sum =
    Reducer.make<number>(
        (
            self: number,
            that: number
        ) => self + that,
        0
    )

Sum.initialValue
// 0

Sum.combine(2, 3)
// 5`,
        apis: ["Reducer.Reducer", "Reducer.make", "Combiner.Combiner"],
        notice: "initialValue is not just a convenient seed. It is the reducer's neutral value and therefore the result of combineAll on an empty iterable.",
    },

    Fold: {
        eyebrow: "default combineAll is a left-to-right fold",
        title: "Reduce any Iterable from the reducer's initial value",
        description:
            "When make receives no custom combineAll, Effect loops through the iterable from left to right, starting with initialValue and repeatedly applying combine.",
        code: `const Concat =
    Reducer.make<string>(
        (self, that) =>
            self + that,
        ""
    )

Concat.combineAll(
    ["a", "b", "c"]
)
// "abc"

Concat.combineAll([])
// ""`,
        apis: [
            "Reducer.make",
            "Reducer.Reducer.combine",
            "Reducer.Reducer.combineAll",
            "Reducer.Reducer.initialValue",
        ],
        notice: "The default is specifically left-to-right. That matters for non-commutative reducers such as string concatenation, path construction, or ordered event summaries.",
    },

    Optimize: {
        eyebrow: "optional combineAll replaces the default fold completely",
        title: "Provide a specialized whole-collection implementation when it helps",
        description:
            "The third make argument is a complete replacement for default combineAll. It can short-circuit or use a specialized algorithm, but it should preserve the reducer's intended semantics.",
        code: `const Product =
    Reducer.make<number>(
        (a, b) => a * b,
        1,
        (values) => {
            let result = 1

            for (const value of values) {
                if (value === 0) {
                    return 0
                }
                result *= value
            }

            return result
        }
    )`,
        apis: ["Reducer.make", "Reducer.Reducer.combineAll"],
        notice: "A custom combineAll is an optimization hook, not a second unrelated operation. If it disagrees with repeated combine calls, callers can observe inconsistent reducer behavior.",
    },

    Flip: {
        eyebrow: "reverse the binary combine order",
        title: "Flip non-commutative reducers—and notice what is rebuilt",
        description:
            "Reducer.flip swaps combine arguments and preserves initialValue. Its combineAll is freshly derived from the flipped combine using the default fold; a custom combineAll from the original reducer is not carried over.",
        code: `const Prepend =
    Reducer.flip(
        String.ReducerConcat
    )

Prepend.combine("a", "b")
// "ba"

Prepend.combineAll(
    ["a", "b", "c"]
)
// "cba"`,
        apis: ["Reducer.flip", "String.ReducerConcat"],
        notice: "This re-derivation is easy to miss: flipping a reducer with an optimized custom combineAll keeps the same initialValue but drops that custom whole-collection implementation.",
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

export const build_snapshot = (model: Model): Snapshot => {
    switch (model.buildCase) {
        case "Interface":
            return {
                input: "Reducer<number>",
                operation: "extends Combiner<number>",
                result: "combine + initialValue + combineAll",
                invariant:
                    "one reusable strategy for pairwise and whole-input reduction",
                implementation: "Reducer is a plain structural value",
                guidance:
                    "Pass reducers around as data when multiple APIs should share one reduction rule.",
            }

        case "Identity":
            return {
                input: "Sum = make((a, b) => a + b, 0)",
                operation: "Sum.combineAll([])",
                result: "0",
                invariant: "0 is neutral for addition",
                implementation:
                    "empty iteration returns initialValue unchanged",
                guidance:
                    "Pick an initial value that is genuinely neutral for the combine operation.",
            }

        case "Custom":
            return {
                input: "Reducer.make(combine, initialValue)",
                operation: "construct a domain-specific reducer",
                result: "typed Reducer<A>",
                invariant:
                    "combine remains the pairwise meaning of the reducer",
                implementation: "combineAll is generated unless you supply one",
                guidance:
                    "Create a custom reducer when the standard module reducers do not express the domain rule.",
            }

        case "BuiltIn":
            return {
                input: "Number.ReducerSum · Number.ReducerMultiply · String.ReducerConcat",
                operation: "reuse a pre-built reducer",
                result: `${builtin_examples.sum} · ${builtin_examples.product} · ${builtin_examples.concat}`,
                invariant:
                    "common identities and combine rules are already encoded",
                implementation:
                    "other Effect modules expose reducers as reusable constants",
                guidance:
                    "Prefer a pre-built reducer when it already matches your semantics.",
            }
    }
}

export const fold_snapshot = (model: Model): Snapshot => {
    switch (model.foldCase) {
        case "Empty":
            return {
                input: "Sum.combineAll([])",
                operation: "start at initialValue = 0; visit no items",
                result: String(sum_empty),
                invariant: "empty reduction has a total, predictable result",
                implementation:
                    "the default loop returns its untouched accumulator",
                guidance:
                    "Reducers remove the need for a special empty-collection branch at each call site.",
            }

        case "Sequence":
            return {
                input: "Sum.combineAll([2, 3, 5])",
                operation: "0 → 2 → 5 → 10",
                result: String(sum_values),
                invariant: "left-to-right iteration",
                implementation: "out = combine(out, value) for every value",
                guidance:
                    "Read combineAll as a named reusable fold seeded by initialValue.",
            }

        case "Combine":
            return {
                input: 'Concat.combine("Effect", " Reducer")',
                operation: "one pairwise combine",
                result: '"Effect Reducer"',
                invariant: "same binary rule used by the default combineAll",
                implementation: "inherited Combiner capability",
                guidance:
                    "Use combine directly when two already-reduced values need to be merged.",
            }

        case "Iterable":
            return {
                input: "Array · Set · generator · any Iterable<A>",
                operation: "combineAll consumes through Symbol.iterator",
                result: "one A",
                invariant: "no Array-only API requirement",
                implementation: "for...of over the provided collection",
                guidance:
                    "Pass lazy or custom iterables when materializing an intermediate array would be unnecessary.",
            }
    }
}

export const optimize_snapshot = (model: Model): Snapshot => {
    switch (model.optimizeCase) {
        case "Default":
            return {
                input: "make(combine, initialValue)",
                operation: "omit the third argument",
                result: "default left fold",
                invariant: "combine defines the whole reduction",
                implementation: "Effect generates combineAll for you",
                guidance:
                    "Keep the default until profiling or semantics give you a concrete reason to specialize.",
            }

        case "ShortCircuit": {
            const probe = product_probe([2, 3, 0, 99, 100])

            return {
                input: "Product.combineAll([2, 3, 0, 99, 100])",
                operation: `stop when zero appears after ${String(probe.visited)} visits`,
                result: String(probe.result),
                invariant: "zero is absorbing for multiplication",
                implementation: `custom combineAll short-circuited: ${String(probe.shortCircuited)}`,
                guidance:
                    "Short-circuit only when the skipped suffix cannot change the mathematically intended result.",
            }
        }

        case "Replace":
            return {
                input: "make(combine, initialValue, customCombineAll)",
                operation: "call reducer.combineAll(values)",
                result: "customCombineAll(values)",
                invariant: "the default fold is not run before or after it",
                implementation:
                    "third argument completely replaces the generated method",
                guidance:
                    "The custom function owns iteration, seeding, short-circuiting, and final output.",
            }

        case "Semantics":
            return {
                input: "combineAll([a, b, c])",
                operation:
                    "compare with combine(combine(combine(initial, a), b), c)",
                result: "should represent the same reduction",
                invariant: "optimization should not invent a second meaning",
                implementation: "Effect does not enforce this law for you",
                guidance:
                    "Treat semantic agreement between combine and combineAll as part of your reducer contract.",
            }
    }
}

export const flip_snapshot = (model: Model): Snapshot => {
    switch (model.flipCase) {
        case "Pair":
            return {
                input: 'Prepend.combine("a", "b")',
                operation: 'original combine("b", "a")',
                result: `"${prepend_pair}"`,
                invariant: "only argument order changes",
                implementation: "flip wraps the original combine function",
                guidance:
                    "Flip is observable mainly for non-commutative operations.",
            }

        case "All":
            return {
                input: 'Prepend.combineAll(["a", "b", "c"])',
                operation: '"" → "a" → "ba" → "cba"',
                result: `"${prepend_all}"`,
                invariant:
                    "iteration stays left-to-right while pairwise argument order is reversed",
                implementation:
                    "fresh default combineAll over the flipped combine",
                guidance:
                    "Do not confuse flipping combine arguments with iterating the source collection backwards.",
            }

        case "Custom": {
            const probe = flip_probe()

            return {
                input: "flip(reducerWithCustomCombineAll)",
                operation: "run combineAll on base, then on flipped reducer",
                result: `${probe.baseResult} → ${probe.flippedResult}`,
                invariant:
                    "flipped reducer keeps combine semantics, not the custom combineAll implementation",
                implementation: `custom combineAll calls: base ${String(probe.baseCustomCombineAllCalls)} · flipped ${String(probe.flippedCustomCombineAllCalls)}`,
                guidance:
                    "If the flipped reducer also needs a specialized combineAll, build that reducer explicitly.",
            }
        }

        case "Identity": {
            const probe = flip_probe()

            return {
                input: "Reducer.flip(Base)",
                operation: "compare initialValue",
                result: String(probe.sameInitialValue),
                invariant: "initialValue is preserved exactly",
                implementation: "make(flippedCombine, reducer.initialValue)",
                guidance:
                    "The same neutral element must make sense for the flipped operation—which it does for lawful reducers.",
            }
        }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedReducerStage: {
        stage: Stage,
    },
    SelectedReducerBuildCase: {
        buildCase: BuildCase,
    },
    SelectedReducerFoldCase: {
        foldCase: FoldCase,
    },
    SelectedReducerOptimizeCase: {
        optimizeCase: OptimizeCase,
    },
    SelectedReducerFlipCase: {
        flipCase: FlipCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Identity",
    foldCase: "Sequence",
    optimizeCase: "ShortCircuit",
    flipCase: "All",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type FoldCasePayload = Readonly<{
    foldCase: FoldCase
}>

type OptimizeCasePayload = Readonly<{
    optimizeCase: OptimizeCase
}>

type FlipCasePayload = Readonly<{
    flipCase: FlipCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedReducerStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedReducerBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedReducerFoldCase: ({ foldCase }: FoldCasePayload) => ({
            model: modifyFields(model, {
                foldCase: () => foldCase,
            }),
        }),

        SelectedReducerOptimizeCase: ({
            optimizeCase,
        }: OptimizeCasePayload) => ({
            model: modifyFields(model, {
                optimizeCase: () => optimizeCase,
            }),
        }),

        SelectedReducerFlipCase: ({ flipCase }: FlipCasePayload) => ({
            model: modifyFields(model, {
                flipCase: () => flipCase,
            }),
        }),
    })
