import { Match as M, Option, pipe, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Option examples
// -----------------------------------------------------------------------------

export const from_undefined = Option.fromNullishOr(undefined)
export const from_null = Option.fromNullishOr(null)
export const from_value = Option.fromNullishOr("hello")

export const parse_json = Option.liftThrowable(JSON.parse)

export const parsed_object = parse_json('{"name":"Ada","age":36}')
export const parsed_failure = parse_json("{ bad json }")

export const transformed = pipe(
    Option.some(4),
    Option.map((n) => n * 2),
    Option.filter((n) => n >= 8),
    Option.flatMap((n) =>
        n % 2 === 0 ? Option.some(`even:${n}`) : Option.none()
    )
)

export const combined_tuple = Option.all([
    Option.some("Ada"),
    Option.some(36),
] as const)

export const combined_struct = Option.all({
    name: Option.some("Ada"),
    age: Option.some(36),
})

export const full_name = Option.zipWith(
    Option.some("Ada"),
    Option.some("Lovelace"),
    (first, last) => `${first} ${last}`
)

export const greeting = pipe(
    Option.some("Ada"),
    Option.match({
        onNone: () => "Missing user",
        onSome: (name) => `Hello, ${name}!`,
    })
)

export const fallback_count = pipe(
    Option.none<number>(),
    Option.getOrElse(() => 0)
)

export const generated = Option.gen(function* () {
    const first = yield* Option.some("Ada")
    const last = yield* Option.some("Lovelace")
    return `${first} ${last}`
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Transform"),
    S.Literal("Combine"),
    S.Literal("Unwrap"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Transform",
    "Combine",
    "Unwrap",
]

export const BoundaryCase = S.Union([
    S.Literal("Undefined"),
    S.Literal("Null"),
    S.Literal("Value"),
])
export type BoundaryCase = typeof BoundaryCase.Type

export const TransformInput = S.Union([
    S.Literal("None"),
    S.Literal("Two"),
    S.Literal("Four"),
    S.Literal("Seven"),
])
export type TransformInput = typeof TransformInput.Type

export const CombineMode = S.Union([
    S.Literal("Tuple"),
    S.Literal("Struct"),
    S.Literal("ZipWith"),
])
export type CombineMode = typeof CombineMode.Type

export const UnwrapMode = S.Union([
    S.Literal("Match"),
    S.Literal("GetOrElse"),
    S.Literal("Gen"),
])
export type UnwrapMode = typeof UnwrapMode.Type

export const Model = S.Struct({
    stage: Stage,

    boundary_case: BoundaryCase,
    parse_input: S.String,

    transform_input: TransformInput,

    combine_mode: CombineMode,
    has_name: S.Boolean,
    has_age: S.Boolean,
    has_city: S.Boolean,

    unwrap_mode: UnwrapMode,
    has_user: S.Boolean,
})
export type Model = typeof Model.Type

export const SelectedOptionStage = taggedStruct("SelectedOptionStage", {
    stage: Stage,
})

export const SelectedBoundaryCase = taggedStruct("SelectedBoundaryCase", {
    boundary_case: BoundaryCase,
})
export const UpdatedParseInput = taggedStruct("UpdatedParseInput", {
    value: S.String,
})

export const SelectedTransformInput = taggedStruct("SelectedTransformInput", {
    transform_input: TransformInput,
})

export const SelectedCombineMode = taggedStruct("SelectedCombineMode", {
    combine_mode: CombineMode,
})
export const ToggledHasName = taggedStruct("ToggledHasName")
export const ToggledHasAge = taggedStruct("ToggledHasAge")
export const ToggledHasCity = taggedStruct("ToggledHasCity")

export const SelectedUnwrapMode = taggedStruct("SelectedUnwrapMode", {
    unwrap_mode: UnwrapMode,
})
export const ToggledHasUser = taggedStruct("ToggledHasUser")

export const Message = S.Union([
    SelectedOptionStage,

    SelectedBoundaryCase,
    UpdatedParseInput,

    SelectedTransformInput,

    SelectedCombineMode,
    ToggledHasName,
    ToggledHasAge,
    ToggledHasCity,

    SelectedUnwrapMode,
    ToggledHasUser,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",

    boundary_case: "Undefined",
    parse_input: '{"name":"Ada","age":36}',

    transform_input: "Four",

    combine_mode: "Tuple",
    has_name: true,
    has_age: true,
    has_city: false,

    unwrap_mode: "Match",
    has_user: true,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedOptionStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedBoundaryCase: ({ boundary_case }) => ({
                model: modifyFields(model, { boundary_case: () => boundary_case }),
                commands: [],
            }),
            UpdatedParseInput: ({ value }) => ({
                model: modifyFields(model, { parse_input: () => value }),
                commands: [],
            }),

            SelectedTransformInput: ({ transform_input }) => ({
                model: modifyFields(model, { transform_input: () => transform_input }),
                commands: [],
            }),

            SelectedCombineMode: ({ combine_mode }) => ({
                model: modifyFields(model, { combine_mode: () => combine_mode }),
                commands: [],
            }),
            ToggledHasName: () => ({
                model: modifyFields(model, { has_name: (value) => !value }),
                commands: [],
            }),
            ToggledHasAge: () => ({
                model: modifyFields(model, { has_age: (value) => !value }),
                commands: [],
            }),
            ToggledHasCity: () => ({
                model: modifyFields(model, { has_city: (value) => !value }),
                commands: [],
            }),

            SelectedUnwrapMode: ({ unwrap_mode }) => ({
                model: modifyFields(model, { unwrap_mode: () => unwrap_mode }),
                commands: [],
            }),
            ToggledHasUser: () => ({
                model: modifyFields(model, { has_user: (value) => !value }),
                commands: [],
            }),
        })
    )

export const boundary_value = (
    boundary_case: BoundaryCase
): null | undefined | string => {
    switch (boundary_case) {
        case "Undefined":
            return undefined
        case "Null":
            return null
        case "Value":
            return "Ada"
    }
}

export const boundary_option = (
    boundary_case: BoundaryCase
): Option.Option<string> => Option.fromNullishOr(boundary_value(boundary_case))

export const safe_parse = Option.liftThrowable(JSON.parse)

export const transform_source = (
    transform_input: TransformInput
): Option.Option<number> => {
    switch (transform_input) {
        case "None":
            return Option.none()
        case "Two":
            return Option.some(2)
        case "Four":
            return Option.some(4)
        case "Seven":
            return Option.some(7)
    }
}

export const transformed_option = (
    transform_input: TransformInput
): Option.Option<string> =>
    pipe(
        transform_source(transform_input),
        Option.map((n) => n * 2),
        Option.filter((n) => n >= 8),
        Option.flatMap((n) =>
            n % 2 === 0 ? Option.some(`even:${n}`) : Option.none()
        )
    )

export const combine_result = (
    model: Model
): Option.Option<
    | readonly [string, number]
    | {
          readonly name: string
          readonly age: number
          readonly city: string
      }
    | string
> => {
    const name = model.has_name ? Option.some("Ada") : Option.none<string>()

    const age = model.has_age ? Option.some(36) : Option.none<number>()

    const city = model.has_city ? Option.some("London") : Option.none<string>()

    switch (model.combine_mode) {
        case "Tuple":
            return Option.all([name, age] as const)
        case "Struct":
            return Option.all({
                name,
                age,
                city,
            })
        case "ZipWith":
            return Option.zipWith(
                name,
                city,
                (left, right) => `${left} → ${right}`
            )
    }
}

export const unwrap_source = (has_user: boolean): Option.Option<string> =>
    has_user ? Option.some("Ada") : Option.none()

export const unwrap_output = (model: Model): string => {
    const source = unwrap_source(model.has_user)

    switch (model.unwrap_mode) {
        case "Match":
            return Option.match(source, {
                onNone: () => "Missing user",
                onSome: (name) => `Hello, ${name}!`,
            })
        case "GetOrElse":
            return pipe(
                source,
                Option.getOrElse(() => "Anonymous")
            )
        case "Gen":
            return Option.match(
                Option.gen(function* () {
                    const first = yield* source
                    const last = yield* Option.some("Lovelace")
                    return `${first} ${last}`
                }),
                {
                    onNone: () => "Generator short-circuited",
                    onSome: (value) => value,
                }
            )
    }
}

export const option_to_label = <A>(option: Option.Option<A>): string =>
    Option.match(option, {
        onNone: () => "Option.none()",
        onSome: (value) => `Option.some(${JSON.stringify(value)})`,
    })
