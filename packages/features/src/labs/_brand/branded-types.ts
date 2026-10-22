import { Brand, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

export type StructuralUserId = number
export type StructuralProductId = number

export type UserId = number & Brand.Brand<"UserId">
export type ProductId = number & Brand.Brand<"ProductId">
export type Int = number & Brand.Brand<"Int">
export type Positive = number & Brand.Brand<"Positive">

export const UserId = Brand.nominal<UserId>()
export const ProductId = Brand.nominal<ProductId>()

// Effect v4 calls the validating constructor Brand.make. This is the same
// role demonstrated by Brand.refined in the Effect v3 branded-types guide.
export const Int = Brand.make<Int>((n) =>
    Number.isInteger(n) ? undefined : `Expected ${n} to be an integer`
)
export const Positive = Brand.make<Positive>((n) =>
    n > 0 ? undefined : `Expected ${n} to be positive`
)
export const PositiveInt = Brand.all(Int, Positive)

// These two snippets are intentionally part of the compiled example. They make
// the lesson's first two panels true TypeScript examples rather than a runtime
// imitation of nominal typing.
const getStructuralProductById = (_product_id: StructuralProductId): void => {}
const structural_user_id: StructuralUserId = 42
getStructuralProductById(structural_user_id)

const getProductById = (_product_id: ProductId): void => {}
const user_id = UserId(42)
const product_id = ProductId(42)
// @ts-expect-error UserId is not assignable to ProductId
getProductById(user_id)
getProductById(product_id)

export const Stage = S.Union([
    S.Literal("Structural"),
    S.Literal("Nominal"),
    S.Literal("Refined"),
    S.Literal("Combined"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Structural",
    "Nominal",
    "Refined",
    "Combined",
]

export const NominalKind = S.Union([
    S.Literal("UserId"),
    S.Literal("ProductId"),
])
export type NominalKind = typeof NominalKind.Type

export const Model = S.Struct({
    stage: Stage,
    structural_was_sent: S.Boolean,
    nominal_kind: NominalKind,
    nominal_was_sent: S.Boolean,
    refined_input: S.String,
    combined_input: S.String,
})
export type Model = typeof Model.Type

export const SelectedBrandedTypesStage = taggedStruct(
    "SelectedBrandedTypesStage",
    {
        stage: Stage,
    }
)
export const ClickedStructuralMixup = taggedStruct("ClickedStructuralMixup")
export const SelectedNominalKind = taggedStruct("SelectedNominalKind", {
    kind: NominalKind,
})
export const ClickedNominalGate = taggedStruct("ClickedNominalGate")
export const UpdatedRefinedInput = taggedStruct("UpdatedRefinedInput", {
    value: S.String,
})
export const UpdatedCombinedInput = taggedStruct("UpdatedCombinedInput", {
    value: S.String,
})

export const Message = S.Union([
    SelectedBrandedTypesStage,
    ClickedStructuralMixup,
    SelectedNominalKind,
    ClickedNominalGate,
    UpdatedRefinedInput,
    UpdatedCombinedInput,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Structural",
    structural_was_sent: false,
    nominal_kind: "UserId",
    nominal_was_sent: false,
    refined_input: "3.14",
    combined_input: "-3.2",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedBrandedTypesStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),
            ClickedStructuralMixup: () => ({
                model: modifyFields(model, { structural_was_sent: () => true }),
                commands: [],
            }),
            SelectedNominalKind: ({ kind }) => ({
                model: modifyFields(model, {
                    nominal_kind: () => kind,
                    nominal_was_sent: () => false,
                }),
                commands: [],
            }),
            ClickedNominalGate: () => ({
                model: modifyFields(model, { nominal_was_sent: () => true }),
                commands: [],
            }),
            UpdatedRefinedInput: ({ value }) => ({
                model: modifyFields(model, { refined_input: () => value }),
                commands: [],
            }),
            UpdatedCombinedInput: ({ value }) => ({
                model: modifyFields(model, { combined_input: () => value }),
                commands: [],
            }),
        })
    )

export const number_from_input = (input: string): number =>
    input.trim() === "" ? Number.NaN : Number(input)

export const nominal_gate_accepts = (model: Model): boolean =>
    model.nominal_kind === "ProductId"

export const is_int = (value: number): boolean => Int.is(value)
export const is_positive = (value: number): boolean => Positive.is(value)
export const positive_int_accepts = (value: number): boolean =>
    PositiveInt.is(value)

export const int_error = (value: number): string =>
    `Expected ${value} to be an integer`
export const positive_error = (value: number): string =>
    `Expected ${value} to be positive`

export const combined_errors = (value: number): ReadonlyArray<string> => {
    const errors: Array<string> = []
    if (!is_int(value)) errors.push(int_error(value))
    if (!is_positive(value)) errors.push(positive_error(value))
    return errors
}
