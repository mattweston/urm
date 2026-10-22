import { Match as M, Option, pipe, Schema as S, String as Str } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 String examples
// -----------------------------------------------------------------------------

export const normalized = pipe(
    "  hELLo WoRLD  ",
    Str.trim,
    Str.toLowerCase,
    Str.capitalize
)
// "Hello world"

// Several helpers preserve string-literal information in their return type.
export type TrimmedLiteral = Str.Trim<"  hello  ">
export type UpperLiteral = Uppercase<"effect">

export const split_words = pipe("effect,string,helpers", Str.split(","))

export const first_five = pipe("Hello World", Str.takeLeft(5))

export const last_five = pipe("Hello World", Str.takeRight(5))

export const middle = pipe("abcdefgh", Str.slice(2, 6))

// Safe indexed access returns Option instead of sentinel values.
export const safe_character = Str.at("Effect", 2)
export const missing_character = Str.at("Effect", 99)

export const found_index = pipe("hello effect world", Str.indexOf("effect"))

export const missing_index = pipe("hello effect world", Str.indexOf("missing"))

export const contains_effect = pipe(
    "hello effect world",
    Str.includes("effect")
)

export const begins_with_hello = pipe(
    "hello effect world",
    Str.startsWith("hello")
)

export const ends_with_world = pipe("hello effect world", Str.endsWith("world"))

// General case normalizers added in Effect 4.
export const as_camel = Str.camelCase("HTTP response_code")

export const as_pascal = Str.pascalCase("HTTP response_code")

export const as_snake = Str.snakeCase("HTTP responseCode")

export const as_kebab = Str.kebabCase("HTTP responseCode")

export const as_constant = Str.constantCase("http responseCode")

export const as_config = Str.configCase("api-v2 xml")

// Multiline helpers.
export const margin_text = Str.stripMargin("  |hello\n  |from\n  |Effect")

export const line_values = Array.from(
    Str.linesIterator("hello\nfrom\nEffect\n")
)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Normalize"),
    S.Literal("Inspect"),
    S.Literal("Segment"),
    S.Literal("Naming"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Normalize",
    "Inspect",
    "Segment",
    "Naming",
]

export const InspectMode = S.Union([
    S.Literal("Includes"),
    S.Literal("StartsWith"),
    S.Literal("EndsWith"),
    S.Literal("At"),
    S.Literal("IndexOf"),
])
export type InspectMode = typeof InspectMode.Type

export const SegmentMode = S.Union([
    S.Literal("Split"),
    S.Literal("Slice"),
    S.Literal("TakeLeft"),
    S.Literal("TakeRight"),
])
export type SegmentMode = typeof SegmentMode.Type

export const NamingMode = S.Union([
    S.Literal("Camel"),
    S.Literal("Pascal"),
    S.Literal("Snake"),
    S.Literal("Kebab"),
    S.Literal("Constant"),
    S.Literal("Config"),
])
export type NamingMode = typeof NamingMode.Type

export const Model = S.Struct({
    stage: Stage,

    normalize_input: S.String,
    normalize_step: S.Number,

    inspect_mode: InspectMode,
    inspect_text: S.String,
    inspect_query: S.String,
    inspect_index: S.Number,

    segment_mode: SegmentMode,

    naming_mode: NamingMode,
    naming_input: S.String,
})
export type Model = typeof Model.Type

export const SelectedStringStage = taggedStruct("SelectedStringStage", {
    stage: Stage,
})

export const UpdatedNormalizeInput = taggedStruct("UpdatedNormalizeInput", {
    value: S.String,
})
export const ClickedAdvanceStringNormalize = taggedStruct(
    "ClickedAdvanceStringNormalize"
)
export const ClickedResetStringNormalize = taggedStruct(
    "ClickedResetStringNormalize"
)

export const SelectedStringInspectMode = taggedStruct(
    "SelectedStringInspectMode",
    { mode: InspectMode }
)
export const UpdatedStringInspectText = taggedStruct(
    "UpdatedStringInspectText",
    { value: S.String }
)
export const UpdatedStringInspectQuery = taggedStruct(
    "UpdatedStringInspectQuery",
    { value: S.String }
)
export const SelectedStringInspectIndex = taggedStruct(
    "SelectedStringInspectIndex",
    { index: S.Number }
)

export const SelectedStringSegmentMode = taggedStruct(
    "SelectedStringSegmentMode",
    { mode: SegmentMode }
)

export const SelectedStringNamingMode = taggedStruct(
    "SelectedStringNamingMode",
    { mode: NamingMode }
)
export const UpdatedStringNamingInput = taggedStruct(
    "UpdatedStringNamingInput",
    { value: S.String }
)

export const Message = S.Union([
    SelectedStringStage,

    UpdatedNormalizeInput,
    ClickedAdvanceStringNormalize,
    ClickedResetStringNormalize,

    SelectedStringInspectMode,
    UpdatedStringInspectText,
    UpdatedStringInspectQuery,
    SelectedStringInspectIndex,

    SelectedStringSegmentMode,

    SelectedStringNamingMode,
    UpdatedStringNamingInput,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Normalize",

    normalize_input: "  hELLo WoRLD  ",
    normalize_step: 0,

    inspect_mode: "Includes",
    inspect_text: "hello effect world",
    inspect_query: "effect",
    inspect_index: 6,

    segment_mode: "Split",

    naming_mode: "Camel",
    naming_input: "HTTP response_code",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedStringStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            UpdatedNormalizeInput: ({ value }) => ({
                model: modifyFields(model, {
                    normalize_input: () => value,
                    normalize_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceStringNormalize: () => ({
                model: modifyFields(model, {
                    normalize_step: (step) => Math.min(3, step + 1),
                }),
                commands: [],
            }),

            ClickedResetStringNormalize: () => ({
                model: modifyFields(model, { normalize_step: () => 0 }),
                commands: [],
            }),

            SelectedStringInspectMode: ({ mode }) => ({
                model: modifyFields(model, { inspect_mode: () => mode }),
                commands: [],
            }),

            UpdatedStringInspectText: ({ value }) => ({
                model: modifyFields(model, { inspect_text: () => value }),
                commands: [],
            }),

            UpdatedStringInspectQuery: ({ value }) => ({
                model: modifyFields(model, { inspect_query: () => value }),
                commands: [],
            }),

            SelectedStringInspectIndex: ({ index }) => ({
                model: modifyFields(model, { inspect_index: () => index }),
                commands: [],
            }),

            SelectedStringSegmentMode: ({ mode }) => ({
                model: modifyFields(model, { segment_mode: () => mode }),
                commands: [],
            }),

            SelectedStringNamingMode: ({ mode }) => ({
                model: modifyFields(model, { naming_mode: () => mode }),
                commands: [],
            }),

            UpdatedStringNamingInput: ({ value }) => ({
                model: modifyFields(model, { naming_input: () => value }),
                commands: [],
            }),
        })
    )

export const normalize_values = (input: string): ReadonlyArray<string> => {
    const trimmed = Str.trim(input)
    const lower = Str.toLowerCase(trimmed)
    const capitalized = Str.capitalize(lower)

    return [input, trimmed, lower, capitalized]
}

export type InspectResult =
    | Readonly<{
          _tag: "Boolean"
          value: boolean
          expression: string
      }>
    | Readonly<{
          _tag: "Option"
          value: Option.Option<string | number>
          expression: string
      }>

export const inspect_result = (model: Model): InspectResult => {
    switch (model.inspect_mode) {
        case "Includes":
            return {
                _tag: "Boolean",
                value: Str.includes(model.inspect_query)(model.inspect_text),
                expression: `String.includes("${model.inspect_query}")`,
            }
        case "StartsWith":
            return {
                _tag: "Boolean",
                value: Str.startsWith(model.inspect_query)(model.inspect_text),
                expression: `String.startsWith("${model.inspect_query}")`,
            }
        case "EndsWith":
            return {
                _tag: "Boolean",
                value: Str.endsWith(model.inspect_query)(model.inspect_text),
                expression: `String.endsWith("${model.inspect_query}")`,
            }
        case "At":
            return {
                _tag: "Option",
                value: Str.at(model.inspect_text, model.inspect_index),
                expression: `String.at(${model.inspect_index})`,
            }
        case "IndexOf":
            return {
                _tag: "Option",
                value: Str.indexOf(model.inspect_query)(model.inspect_text),
                expression: `String.indexOf("${model.inspect_query}")`,
            }
    }
}

export const segment_input = "effect-string-helpers"

export const segment_result = (mode: SegmentMode): ReadonlyArray<string> => {
    switch (mode) {
        case "Split":
            return Str.split(segment_input, "-")
        case "Slice":
            return [Str.slice(7, 13)(segment_input)]
        case "TakeLeft":
            return [Str.takeLeft(segment_input, 6)]
        case "TakeRight":
            return [Str.takeRight(segment_input, 7)]
    }
}

export const naming_result = (mode: NamingMode, input: string): string => {
    switch (mode) {
        case "Camel":
            return Str.camelCase(input)
        case "Pascal":
            return Str.pascalCase(input)
        case "Snake":
            return Str.snakeCase(input)
        case "Kebab":
            return Str.kebabCase(input)
        case "Constant":
            return Str.constantCase(input)
        case "Config":
            return Str.configCase(input)
    }
}

export const stripped_margin = Str.stripMargin("  |hello\n  |from\n  |Effect")
