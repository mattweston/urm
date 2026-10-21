import {
    Combiner,
    Number as Num,
    Reducer,
    Schema as S,
    String as Str,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Combiner examples
// -----------------------------------------------------------------------------

export const Sum = Combiner.make<number>((self, that) => self + that)

export const Product = Combiner.make<number>((self, that) => self * that)

export const Min = Combiner.min(Num.Order)

export const Max = Combiner.max(Num.Order)

export const First = Combiner.first<string>()

export const Last = Combiner.last<string>()

export const AlwaysFallback = Combiner.constant("fallback")

// Reducer is also a Combiner, so it can be wrapped by Combiner helpers.
export const Prepend = Combiner.flip(Str.ReducerConcat)

export const Csv = Combiner.intercalate(",")(Str.ReducerConcat)

export const Path = Combiner.intercalate("/")(Str.ReducerConcat)

// Reducer extends Combiner with an identity + combineAll.
export const SumReducer = Reducer.make<number>((self, that) => self + that, 0)

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Make", "Pick", "Transform", "Reducer"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Make",
    "Pick",
    "Transform",
    "Reducer",
]

export const MakeMode = S.Literals(["Sum", "Product", "Merge"])
export type MakeMode = typeof MakeMode.Type

export const PickMode = S.Literals(["Min", "Max", "First", "Last", "Constant"])
export type PickMode = typeof PickMode.Type

export const TransformMode = S.Literals([
    "Flip",
    "IntercalateComma",
    "IntercalatePath",
])
export type TransformMode = typeof TransformMode.Type

export const ReducerMode = S.Literals(["Pair", "Empty", "NonEmpty", "Derive"])
export type ReducerMode = typeof ReducerMode.Type

export const Model = S.Struct({
    stage: Stage,
    makeMode: MakeMode,
    pickMode: PickMode,
    transformMode: TransformMode,
    reducerMode: ReducerMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedCombinerStage: {
        stage: Stage,
    },
    SelectedCombinerMakeMode: {
        makeMode: MakeMode,
    },
    SelectedCombinerPickMode: {
        pickMode: PickMode,
    },
    SelectedCombinerTransformMode: {
        transformMode: TransformMode,
    },
    SelectedCombinerReducerMode: {
        reducerMode: ReducerMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Make",
    makeMode: "Sum",
    pickMode: "Max",
    transformMode: "IntercalateComma",
    reducerMode: "Pair",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedCombinerStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedCombinerMakeMode: ({ makeMode }) => ({
            model: modifyFields(model, {
                makeMode: () => makeMode,
            }),
        }),

        SelectedCombinerPickMode: ({ pickMode }) => ({
            model: modifyFields(model, {
                pickMode: () => pickMode,
            }),
        }),

        SelectedCombinerTransformMode: ({ transformMode }) => ({
            model: modifyFields(model, {
                transformMode: () => transformMode,
            }),
        }),

        SelectedCombinerReducerMode: ({ reducerMode }) => ({
            model: modifyFields(model, {
                reducerMode: () => reducerMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const makeResult = (
    mode: MakeMode
): Readonly<{
    expression: string
    left: string
    right: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Sum":
            return {
                expression: "Combiner.make<number>((a, b) => a + b)",
                left: "3",
                right: "4",
                output: String(Sum.combine(3, 4)),
                detail: "make wraps any binary A × A → A function. Combiner does not enforce associativity or purity; those laws are the caller's responsibility.",
            }

        case "Product":
            return {
                expression: "Combiner.make<number>((a, b) => a * b)",
                left: "3",
                right: "5",
                output: String(Product.combine(3, 5)),
                detail: "A Combiner is just one reusable strategy for merging two values of the same type.",
            }

        case "Merge": {
            type Config = Readonly<{
                retries: number
                label: string
            }>

            const MergeConfig = Combiner.make<Config>((self, that) => ({
                retries: Math.max(self.retries, that.retries),
                label: `${self.label}+${that.label}`,
            }))

            const left = {
                retries: 2,
                label: "local",
            }
            const right = {
                retries: 5,
                label: "remote",
            }

            return {
                expression:
                    "Combiner.make<Config>((a, b) => ({ retries: max, label: concat }))",
                left: JSON.stringify(left),
                right: JSON.stringify(right),
                output: JSON.stringify(MergeConfig.combine(left, right)),
                detail: "The merged type stays Config. A Combiner is useful as a dependency passed into generic merge logic.",
            }
        }
    }
}

export const pickResult = (
    mode: PickMode
): Readonly<{
    expression: string
    left: string
    right: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Min":
            return {
                expression: "Combiner.min(Number.Order)",
                left: "8",
                right: "3",
                output: String(Min.combine(8, 3)),
                detail: "min delegates comparison to an Order. When values compare equal, the second argument is returned.",
            }

        case "Max":
            return {
                expression: "Combiner.max(Number.Order)",
                left: "8",
                right: "3",
                output: String(Max.combine(8, 3)),
                detail: "max is ideal when a generic API needs a reusable strategy for selecting the larger value.",
            }

        case "First":
            return {
                expression: "Combiner.first<string>()",
                left: '"old"',
                right: '"new"',
                output: First.combine("old", "new"),
                detail: "first implements first-write-wins: the right side is ignored.",
            }

        case "Last":
            return {
                expression: "Combiner.last<string>()",
                left: '"old"',
                right: '"new"',
                output: Last.combine("old", "new"),
                detail: "last implements last-write-wins: the left side is ignored.",
            }

        case "Constant":
            return {
                expression: 'Combiner.constant("fallback")',
                left: '"A"',
                right: '"B"',
                output: AlwaysFallback.combine("A", "B"),
                detail: "constant ignores both values. It is useful when a generic API requires a Combiner but the merged result is predetermined.",
            }
    }
}

export const transformResult = (
    mode: TransformMode
): Readonly<{
    expression: string
    base: string
    left: string
    right: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Flip":
            return {
                expression: "Combiner.flip(String.ReducerConcat)",
                base: 'base combine("a","b") → "ab"',
                left: '"a"',
                right: '"b"',
                output: Prepend.combine("a", "b"),
                detail: "flip reverses argument order. It matters only for non-commutative combiners.",
            }

        case "IntercalateComma":
            return {
                expression: 'Combiner.intercalate(",")(String.ReducerConcat)',
                base: 'concat("a","b") → "ab"',
                left: '"a"',
                right: '"b"',
                output: Csv.combine("a", "b"),
                detail: 'intercalate inserts a fixed middle value: combine(a, combine(",", b)) → "a,b".',
            }

        case "IntercalatePath":
            return {
                expression: 'Combiner.intercalate("/")(String.ReducerConcat)',
                base: 'concat("api","users") → "apiusers"',
                left: '"api"',
                right: '"users"',
                output: Path.combine("api", "users"),
                detail: "The same combinator works for path-like or delimiter-based combination whenever the base Combiner understands the value type.",
            }
    }
}

export const reducerResult = (
    mode: ReducerMode
): Readonly<{
    combiner: string
    reducer: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Pair":
            return {
                combiner: "Combiner: combine(3, 4) → 7",
                reducer: "Reducer: combine(3, 4) → 7",
                output: `${Sum.combine(3, 4)} / ${SumReducer.combine(3, 4)}`,
                detail: "For two values, Reducer and Combiner look the same because Reducer extends Combiner.",
            }

        case "Empty":
            return {
                combiner: "Combiner: no empty value exists in the interface",
                reducer: "Reducer: initialValue = 0",
                output: String(SumReducer.combineAll([])),
                detail: "This is the defining difference: Reducer can reduce an empty collection because it has an identity; Combiner cannot promise one.",
            }

        case "NonEmpty":
            return {
                combiner:
                    "Combiner: generic non-empty fold can seed with first element",
                reducer: "Reducer: combineAll([2,3,4])",
                output: String(SumReducer.combineAll([2, 3, 4])),
                detail: "A Combiner is enough for non-empty pairwise merging. Reducer is more convenient when empty collections are part of the API.",
            }

        case "Derive":
            return {
                combiner: "Combiner = { combine }",
                reducer: "Reducer = { combine, initialValue, combineAll }",
                output: "Reducer<A> extends Combiner<A>",
                detail: "Choose the smallest algebra your generic API really needs. Requiring Reducer when only pairwise combine is needed unnecessarily demands an identity value.",
            }
    }
}
