import { Schema as S, type Types } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TYPE-LEVEL EXAMPLES
// -----------------------------------------------------------------------------

export interface Producer<A> {
    readonly variance: Types.Covariant<A>
    readonly get: () => A
}

export interface Consumer<A> {
    readonly variance: Types.Contravariant<A>
    readonly accept: (value: A) => void
}

export interface Cell<A> {
    readonly variance: Types.Invariant<A>
    readonly value: A
}

export type ProducerValue = Types.Covariant.Type<Producer<string>["variance"]>
export type ConsumerValue = Types.Contravariant.Type<
    Consumer<string>["variance"]
>
export type CellValue = Types.Invariant.Type<Cell<number>["variance"]>

export const with_default = <A>(
    value: A,
    fallback: Types.NoInfer<A>
): readonly [A, A] => [value, fallback] as const

export type AppError =
    | { readonly _tag: "NotFound"; readonly id: string }
    | { readonly _tag: "Timeout"; readonly ms: number }

export type AppErrorTags = Types.Tags<AppError>
export type OnlyTimeout = Types.ExtractTag<AppError, "Timeout">
export type WithoutTimeout = Types.ExcludeTag<AppError, "Timeout">

export type RightMerged = Types.MergeRight<
    { readonly id: number; readonly role: "user" },
    { readonly role: "admin"; readonly active: boolean }
>

export type LeftMerged = Types.MergeLeft<
    { readonly id: number; readonly role: "user" },
    { readonly role: "admin"; readonly active: boolean }
>

export type MutableConfig = Types.Mutable<{
    readonly retries: number
    readonly labels: ReadonlyArray<string>
}>

export type DeepMutableConfig = Types.DeepMutable<{
    readonly retries: number
    readonly nested: ReadonlyArray<{ readonly enabled: boolean }>
}>

export type StrictInput = Types.NoExcessProperties<
    { readonly id: string },
    { readonly id: string }
>

export type Triple = Types.TupleOf<3, number>
export type AtLeastTwo = Types.TupleOfAtLeast<2, string>
export type Combined = Types.UnionToIntersection<
    { readonly a: string } | { readonly b: number }
>
export type CombinedSimple = Types.Simplify<Combined>
export type UnionCheck = Types.IsUnion<"a" | "b">

export type RequiredOnly = Types.RequiredKeys<{
    readonly id: string
    readonly nickname?: string
    readonly active: boolean
}>

export type RetryPolicy = Types.Concurrency
export const concurrency_examples: ReadonlyArray<RetryPolicy> = [
    1,
    4,
    "unbounded",
]

export type RateLimitReason = {
    readonly _tag: "RateLimit"
    readonly retryAfter: number
}
export type QuotaReason = {
    readonly _tag: "Quota"
    readonly limit: number
}
export type ApiError = {
    readonly _tag: "ApiError"
    readonly reason: RateLimitReason | QuotaReason
}

export type ApiReasons = Types.ReasonOf<ApiError>
export type ApiReasonTags = Types.ReasonTags<ApiError>
export type OnlyRateLimit = Types.ExtractReason<ApiError, "RateLimit">
export type ApiWithRateLimit = Types.NarrowReason<ApiError, "RateLimit">
export type ApiWithoutRateLimit = Types.OmitReason<ApiError, "RateLimit">
export type RemainingReasons = Types.ExcludeReason<ApiError, "RateLimit">

export type EqualityYes = Types.Equals<{ a: 1 }, { a: 1 }>
export type EqualityChoice = Types.EqualsWith<
    string,
    string,
    "same",
    "different"
>
export type HasIdentifier = Types.Has<
    { id: string; name: string },
    "id" | "slug"
>
export type NonCallable = Types.NotFunction<string | number | (() => void)>
export type MaybeVoid = Types.VoidIfEmpty<{}>
export type AssignedMarker = Types.unassigned
export type UnhandledMarker = Types.unhandled

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Variance"),
    S.Literal("Shape"),
    S.Literal("Tuples"),
    S.Literal("Control"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Variance",
    "Shape",
    "Tuples",
    "Control",
]

export const VarianceCase = S.Union([
    S.Literal("Covariant"),
    S.Literal("Contravariant"),
    S.Literal("Invariant"),
    S.Literal("NoInfer"),
])
export type VarianceCase = typeof VarianceCase.Type
export const variance_cases: ReadonlyArray<VarianceCase> = [
    "Covariant",
    "Contravariant",
    "Invariant",
    "NoInfer",
]

export const ShapeCase = S.Union([
    S.Literal("Tags"),
    S.Literal("Merge"),
    S.Literal("Mutable"),
    S.Literal("Exactness"),
])
export type ShapeCase = typeof ShapeCase.Type
export const shape_cases: ReadonlyArray<ShapeCase> = [
    "Tags",
    "Merge",
    "Mutable",
    "Exactness",
]

export const TuplesCase = S.Union([
    S.Literal("TupleOf"),
    S.Literal("AtLeast"),
    S.Literal("Required"),
    S.Literal("Union"),
])
export type TuplesCase = typeof TuplesCase.Type
export const tuples_cases: ReadonlyArray<TuplesCase> = [
    "TupleOf",
    "AtLeast",
    "Required",
    "Union",
]

export const ControlCase = S.Union([
    S.Literal("Concurrency"),
    S.Literal("Reason"),
    S.Literal("Equality"),
    S.Literal("Markers"),
])
export type ControlCase = typeof ControlCase.Type
export const control_cases: ReadonlyArray<ControlCase> = [
    "Concurrency",
    "Reason",
    "Equality",
    "Markers",
]

export const Model = S.Struct({
    stage: Stage,
    varianceCase: VarianceCase,
    shapeCase: ShapeCase,
    tuplesCase: TuplesCase,
    controlCase: ControlCase,
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
    Variance: {
        eyebrow: "Phantom function types steer assignment and inference",
        title: "Encode variance and control inference",
        description:
            "Covariant, Contravariant, and Invariant are phantom function aliases used throughout Effect's generic APIs. NoInfer keeps a position type-checked without allowing it to drive inference.",
        code: `interface Producer<A> {
    readonly variance: Types.Covariant<A>
}

type A = Types.Covariant.Type<Producer<string>["variance"]>
// string

function choose<T>(value: T, fallback: Types.NoInfer<T>) {
    return value
}`,
        apis: ["Covariant", "Contravariant", "Invariant", "NoInfer"],
        notice: "These types exist only to guide TypeScript. They emit no runtime marker, object, or function from the Types module.",
    },
    Shape: {
        eyebrow: "Transform object, union, mutability, and exactness shapes",
        title: "Reshape types without runtime conversion",
        description:
            "Tags and tag filters work on discriminated unions; MergeLeft and MergeRight encode key precedence; Mutable and DeepMutable remove readonly; exactness helpers constrain generic object input.",
        code: `type Tags = Types.Tags<AppError>
// "NotFound" | "Timeout"

type Merged = Types.MergeRight<
    { role: "user" },
    { role: "admin"; active: boolean }
>
// { role: "admin"; active: boolean }`,
        apis: [
            "Tags",
            "ExtractTag",
            "MergeRight",
            "DeepMutable",
            "NoExcessProperties",
        ],
        notice: "DeepMutable is structural, not a runtime clone. In live rc.117 it deliberately preserves opaque objects with methods or symbol-keyed properties.",
    },
    Tuples: {
        eyebrow:
            "Express arity, required keys, intersections, and union detection",
        title: "Build stronger compile-time collection shapes",
        description:
            "TupleOf and TupleOfAtLeast encode fixed or minimum lengths. RequiredKeys extracts required object keys. UnionToIntersection, Simplify, and IsUnion support generic type machinery.",
        code: `type Triple = Types.TupleOf<3, number>
// [number, number, number]

type AtLeastTwo = Types.TupleOfAtLeast<2, string>
// [string, string, ...string[]]

type Required = Types.RequiredKeys<{
    id: string
    nickname?: string
}>
// "id"`,
        apis: [
            "TupleOf",
            "TupleOfAtLeast",
            "RequiredKeys",
            "UnionToIntersection",
            "IsUnion",
        ],
        notice: "Live rc.117 refines edge cases: positive fractional TupleOf lengths fall back to Array<T>, and RequiredKeys ignores broad index signatures.",
    },
    Control: {
        eyebrow:
            "Describe concurrency and nested error reasoning at the type level",
        title: "Model control options and reason-tagged errors",
        description:
            "Concurrency captures finite or unbounded parallelism. The Reason* helpers extract, narrow, or remove nested reason variants, while equality and marker types support advanced generic plumbing.",
        code: `const concurrency: Types.Concurrency = "unbounded"

type Tags = Types.ReasonTags<ApiError>
// "RateLimit" | "Quota"

type OnlyRateLimit = Types.ExtractReason<
    ApiError,
    "RateLimit"
>`,
        apis: [
            "Concurrency",
            "ReasonOf",
            "ReasonTags",
            "ExtractReason",
            "Equals",
        ],
        notice: "Reason helpers operate on the nested reason union. NarrowReason and OmitReason preserve the enclosing error shape; ExtractReason and ExcludeReason return nested reason types.",
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

export const variance_snapshot = (model: Model): Snapshot => {
    switch (model.varianceCase) {
        case "Covariant":
            return {
                input: "Producer<string>",
                operation: "Types.Covariant<T>",
                result: "output-direction variance",
                invariant: "subtype direction is preserved",
                implementation: "(_: never) => A",
                guidance:
                    "Use phantom covariance when a generic parameter is produced but not consumed.",
            }
        case "Contravariant":
            return {
                input: "Consumer<string>",
                operation: "Types.Contravariant<T>",
                result: "input-direction variance",
                invariant: "assignment runs in the supertype direction",
                implementation: "(_: A) => void",
                guidance:
                    "Use for phantom parameters representing consumed input.",
            }
        case "Invariant":
            return {
                input: "Cell<number>",
                operation: "Types.Invariant<T>",
                result: "exact generic identity",
                invariant: "different carried types do not substitute",
                implementation: "(_: A) => A",
                guidance:
                    "Use when a parameter is both consumed and produced and substitution must be prevented.",
            }
        case "NoInfer":
            return {
                input: "value + fallback",
                operation: "Types.NoInfer<T>",
                result: "fallback checks but does not infer T",
                invariant: "only selected positions drive inference",
                implementation: "indexed conditional alias",
                guidance:
                    "Use when a secondary argument should conform to an already-inferred type rather than widen it.",
            }
    }
}

export const shape_snapshot = (model: Model): Snapshot => {
    switch (model.shapeCase) {
        case "Tags":
            return {
                input: "tagged union",
                operation: "Tags / ExtractTag / ExcludeTag",
                result: "tag literals or filtered union",
                invariant: "untagged members are ignored by Tags",
                implementation: "distributive conditional types",
                guidance:
                    "Use for discriminated-union plumbing without repeating variant definitions.",
            }
        case "Merge":
            return {
                input: "two object types",
                operation: "MergeLeft / MergeRight",
                result: "biased merged object",
                invariant: "chosen side wins conflicting keys",
                implementation: "intersection + key remap + Simplify",
                guidance:
                    "Pick the merge helper based on which input should win key conflicts.",
            }
        case "Mutable":
            return {
                input: "readonly structure",
                operation: "Mutable / DeepMutable",
                result: "mutable structural type",
                invariant: "type transformation only",
                implementation: "mapped + conditional types",
                guidance:
                    "Use Mutable for one level; DeepMutable for nested structural data. Live rc.117 preserves opaque objects.",
            }
        case "Exactness":
            return {
                input: "expected + candidate object",
                operation: "NoExcessProperties",
                result: "extra keys become never",
                invariant: "generic extras are rejected",
                implementation: "intersection with Record<extra, never>",
                guidance:
                    "Use at generic API boundaries where excess-property checking would otherwise be lost.",
            }
    }
}

export const tuples_snapshot = (model: Model): Snapshot => {
    switch (model.tuplesCase) {
        case "TupleOf":
            return {
                input: "N = 3, T = number",
                operation: "TupleOf<3, number>",
                result: "[number, number, number]",
                invariant: "literal non-negative integer gives exact arity",
                implementation: "recursive tuple accumulator",
                guidance:
                    "Use when array length is part of the compile-time contract.",
            }
        case "AtLeast":
            return {
                input: "N = 2, T = string",
                operation: "TupleOfAtLeast<2, string>",
                result: "two required + variadic tail",
                invariant: "minimum arity is enforced",
                implementation: "TupleOf<N, T> + ...Array<T>",
                guidance:
                    "Useful for variadic APIs that need a fixed minimum number of arguments.",
            }
        case "Required":
            return {
                input: "required + optional properties",
                operation: "RequiredKeys<T>",
                result: "union of required keys",
                invariant: "optional keys are excluded",
                implementation: "Pick test over mapped keys",
                guidance:
                    "Live rc.117 additionally strips broad index signatures before extracting required named keys.",
            }
        case "Union":
            return {
                input: "A | B",
                operation: "UnionToIntersection / IsUnion",
                result: "A & B / true",
                invariant: "conditional types distribute over unions",
                implementation: "contravariant inference trick",
                guidance:
                    "These are advanced helpers for library-level generic composition and type tests.",
            }
    }
}

export const control_snapshot = (model: Model): Snapshot => {
    switch (model.controlCase) {
        case "Concurrency":
            return {
                input: "1 | 4 | unbounded",
                operation: "Types.Concurrency",
                result: 'number | "unbounded"',
                invariant: "describes policy, does not schedule anything",
                implementation: "simple union alias",
                guidance:
                    "Use to type concurrency options accepted by Effect combinators.",
            }
        case "Reason":
            return {
                input: "error with tagged reason union",
                operation: "ReasonOf / NarrowReason / OmitReason",
                result: "reason or narrowed error",
                invariant: "nested reason tags remain discriminated",
                implementation: "nested distributive conditionals",
                guidance:
                    "Choose Extract/Exclude for reason values, Narrow/Omit when the enclosing error shape must be retained.",
            }
        case "Equality":
            return {
                input: "two types",
                operation: "Equals / EqualsWith / Has",
                result: "type-level boolean or branch",
                invariant: "compile-time only",
                implementation: "generic-function comparison + key tests",
                guidance:
                    "Useful in type tests and conditional generic utilities, not runtime validation.",
            }
        case "Markers":
            return {
                input: "internal generic state",
                operation: "unassigned / unhandled / VoidIfEmpty",
                result: "marker or erased-empty type",
                invariant: "supports Effect's type machinery",
                implementation: "unique-symbol interfaces + conditional alias",
                guidance:
                    "These are mostly library-building primitives rather than everyday application types.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Variance":
            return variance_snapshot(model)
        case "Shape":
            return shape_snapshot(model)
        case "Tuples":
            return tuples_snapshot(model)
        case "Control":
            return control_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Variance",
    varianceCase: "Covariant",
    shapeCase: "Tags",
    tuplesCase: "TupleOf",
    controlCase: "Concurrency",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTypesStage: { stage: Stage },
    SelectedTypesVarianceCase: { varianceCase: VarianceCase },
    SelectedTypesShapeCase: { shapeCase: ShapeCase },
    SelectedTypesTuplesCase: { tuplesCase: TuplesCase },
    SelectedTypesControlCase: { controlCase: ControlCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type VarianceCasePayload = Readonly<{ varianceCase: VarianceCase }>
type ShapeCasePayload = Readonly<{ shapeCase: ShapeCase }>
type TuplesCasePayload = Readonly<{ tuplesCase: TuplesCase }>
type ControlCasePayload = Readonly<{ controlCase: ControlCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTypesStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTypesVarianceCase: ({ varianceCase }: VarianceCasePayload) => ({
            model: modifyFields(model, { varianceCase: () => varianceCase }),
        }),
        SelectedTypesShapeCase: ({ shapeCase }: ShapeCasePayload) => ({
            model: modifyFields(model, { shapeCase: () => shapeCase }),
        }),
        SelectedTypesTuplesCase: ({ tuplesCase }: TuplesCasePayload) => ({
            model: modifyFields(model, { tuplesCase: () => tuplesCase }),
        }),
        SelectedTypesControlCase: ({ controlCase }: ControlCasePayload) => ({
            model: modifyFields(model, { controlCase: () => controlCase }),
        }),
    })
