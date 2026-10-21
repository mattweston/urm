import {
    Effect,
    Option,
    Schema as S,
    SchemaGetter,
    type SchemaAST,
    SchemaIssue,
    SchemaTransformation,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// VERSION BRIDGES
// -----------------------------------------------------------------------------

/**
 * URM is pinned to Effect 4.0.0-rc.112. The live SchemaTransformation surface
 * has since renamed a few operations and moved composition out of the instance.
 * These bridges keep the runnable examples on the workspace pin while making
 * the live names visible in the lesson.
 */

type MakeTransformation = <T, E, RD = never, RE = never>(options: {
    readonly decode: SchemaGetter.Getter<T, E, RD>
    readonly encode: SchemaGetter.Getter<E, T, RE>
}) => SchemaTransformation.Transformation<T, E, RD, RE>

export const make_transformation = <T, E, RD = never, RE = never>(options: {
    readonly decode: SchemaGetter.Getter<T, E, RD>
    readonly encode: SchemaGetter.Getter<E, T, RE>
}): SchemaTransformation.Transformation<T, E, RD, RE> => {
    const modern = SchemaTransformation as unknown as Partial<{
        readonly makeTransformation: MakeTransformation
    }>

    if (typeof modern.makeTransformation === "function") {
        return modern.makeTransformation(options)
    }

    const legacy = SchemaTransformation as unknown as Readonly<{
        readonly make: MakeTransformation
    }>

    return legacy.make(options)
}

type TransformEffect = <T, E, RD = never, RE = never>(options: {
    readonly decode: (
        input: E,
        options: SchemaAST.ParseOptions
    ) => Effect.Effect<T, SchemaIssue.Issue, RD>
    readonly encode: (
        input: T,
        options: SchemaAST.ParseOptions
    ) => Effect.Effect<E, SchemaIssue.Issue, RE>
}) => SchemaTransformation.Transformation<T, E, RD, RE>

export const transform_effect = <T, E, RD = never, RE = never>(options: {
    readonly decode: (
        input: E,
        options: SchemaAST.ParseOptions
    ) => Effect.Effect<T, SchemaIssue.Issue, RD>
    readonly encode: (
        input: T,
        options: SchemaAST.ParseOptions
    ) => Effect.Effect<E, SchemaIssue.Issue, RE>
}): SchemaTransformation.Transformation<T, E, RD, RE> => {
    const modern = SchemaTransformation as unknown as Partial<{
        readonly transformEffect: TransformEffect
    }>

    if (typeof modern.transformEffect === "function") {
        return modern.transformEffect(options)
    }

    const legacy = SchemaTransformation as unknown as Readonly<{
        readonly transformOrFail: TransformEffect
    }>

    return legacy.transformOrFail(options)
}

type LegacyComposable<T, E, RD, RE> = Readonly<{
    compose: <T2, RD2, RE2>(
        other: SchemaTransformation.Transformation<T2, T, RD2, RE2>
    ) => SchemaTransformation.Transformation<T2, E, RD | RD2, RE | RE2>
}>

export const compose_transformation = <T, E, RD, RE, T2, RD2, RE2>(
    first: SchemaTransformation.Transformation<T, E, RD, RE>,
    second: SchemaTransformation.Transformation<T2, T, RD2, RE2>
): SchemaTransformation.Transformation<T2, E, RD | RD2, RE | RE2> => {
    const modern = SchemaTransformation as unknown as Partial<{
        readonly composeTransformation: (
            self: SchemaTransformation.Transformation<T, E, RD, RE>,
            other: SchemaTransformation.Transformation<T2, T, RD2, RE2>
        ) => SchemaTransformation.Transformation<T2, E, RD | RD2, RE | RE2>
    }>

    if (typeof modern.composeTransformation === "function") {
        return modern.composeTransformation(first, second)
    }

    return (first as unknown as LegacyComposable<T, E, RD, RE>).compose(second)
}

// -----------------------------------------------------------------------------
// REAL TRANSFORMATION EXAMPLES
// -----------------------------------------------------------------------------

export const cents_from_dollars = SchemaTransformation.transform<
    number,
    number
>({
    decode: (dollars: number) => Math.round(dollars * 100),
    encode: (cents: number) => cents / 100,
})

export const cents_schema = S.Number.pipe(
    S.decodeTo(S.Number, cents_from_dollars)
)

export const strict_integer_from_string = transform_effect<number, string>({
    decode: (input: string, options: SchemaAST.ParseOptions) => {
        const value = Number(input)
        return input.trim().length > 0 && Number.isInteger(value)
            ? Effect.succeed(value)
            : Effect.fail(
                  new SchemaIssue.InvalidValue(
                      { expected: "an integer string" },
                      input,
                      options
                  )
              )
    },
    encode: (input: number, _options: SchemaAST.ParseOptions) =>
        Effect.succeed(String(input)),
})

export const strict_integer_schema = S.String.pipe(
    S.decodeTo(S.Number, strict_integer_from_string)
)

export const default_guest = SchemaTransformation.transformOptional<
    string,
    string
>({
    decode: (input: Option.Option<string>) =>
        Option.isNone(input) ? Option.some("guest") : input,
    encode: (input: Option.Option<string>) =>
        Option.isSome(input) && input.value === "guest" ? Option.none() : input,
})

export const getters_pair = make_transformation<number, string>({
    decode: SchemaGetter.transform<number, string>((input: string) =>
        Number(input)
    ),
    encode: SchemaGetter.transform<string, number>((input: number) =>
        String(input)
    ),
})

export const trim_then_lower = compose_transformation(
    SchemaTransformation.trim(),
    SchemaTransformation.toLowerCase()
)

export const normalized_string_schema = S.String.pipe(S.decode(trim_then_lower))

export const flipped_number_from_string =
    SchemaTransformation.numberFromString.flip()

export const fallback_middleware = new SchemaTransformation.Middleware<
    string,
    string,
    never,
    never,
    never,
    never
>(
    (effect: Effect.Effect<Option.Option<string>, SchemaIssue.Issue>) =>
        Effect.catch(effect, () => Effect.succeed(Option.some("fallback"))),
    (effect: Effect.Effect<Option.Option<string>, SchemaIssue.Issue>) => effect
)

export const json_text_schema = S.String.pipe(
    S.decodeTo(S.Unknown, SchemaTransformation.fromJsonString())
)

export const utf8_from_base64_schema = S.String.pipe(
    S.decodeTo(S.String, SchemaTransformation.stringFromBase64String)
)

// -----------------------------------------------------------------------------
// LESSON MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Compose"),
    S.Literal("Normalize"),
    S.Literal("Convert"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Compose",
    "Normalize",
    "Convert",
]

export const BuildCase = S.Union([
    S.Literal("Pure"),
    S.Literal("Effectful"),
    S.Literal("Optional"),
    S.Literal("Getters"),
])
export type BuildCase = typeof BuildCase.Type

export const ComposeCase = S.Union([
    S.Literal("Compose"),
    S.Literal("Flip"),
    S.Literal("Direction"),
    S.Literal("Middleware"),
])
export type ComposeCase = typeof ComposeCase.Type

export const NormalizeCase = S.Union([
    S.Literal("Trim"),
    S.Literal("Case"),
    S.Literal("Split"),
    S.Literal("Passthrough"),
])
export type NormalizeCase = typeof NormalizeCase.Type

export const ConvertCase = S.Union([
    S.Literal("Numeric"),
    S.Literal("Time"),
    S.Literal("Encoding"),
    S.Literal("Structured"),
])
export type ConvertCase = typeof ConvertCase.Type

export const build_cases: ReadonlyArray<BuildCase> = [
    "Pure",
    "Effectful",
    "Optional",
    "Getters",
]

export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Compose",
    "Flip",
    "Direction",
    "Middleware",
]

export const normalize_cases: ReadonlyArray<NormalizeCase> = [
    "Trim",
    "Case",
    "Split",
    "Passthrough",
]

export const convert_cases: ReadonlyArray<ConvertCase> = [
    "Numeric",
    "Time",
    "Encoding",
    "Structured",
]

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    composeCase: ComposeCase,
    normalizeCase: NormalizeCase,
    convertCase: ConvertCase,
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

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const stage_details: Readonly<Record<Stage, StageDetails>> = {
    Build: {
        eyebrow: "DECODE + ENCODE FORM ONE BIDIRECTIONAL VALUE",
        title: "Choose the smallest transformation constructor that fits",
        description:
            "A Transformation pairs a decode Getter with its inverse encode Getter. Pure functions, effectful validation, optional-key handling, and prebuilt Getters all lead to the same bidirectional model.",
        code: `const t = SchemaTransformation.transform({\n  decode: (dollars: number) =>\n    Math.round(dollars * 100),\n  encode: (cents: number) =>\n    cents / 100\n})\n\nconst schema = S.Number.pipe(\n  S.decodeTo(S.Number, t)\n)`,
        apis: [
            "transform",
            "transformEffect",
            "transformOptional",
            "makeTransformation",
        ],
        notice: "Use a value-level Transformation when conversion semantics belong to one value. Missing-key semantics live in Option, while validation failures live in SchemaIssue.Issue.",
    },
    Compose: {
        eyebrow: "DECODE FORWARD · ENCODE IN REVERSE",
        title: "Compose transformations without losing the inverse direction",
        description:
            "Composition applies the first decode then the second decode. Encoding necessarily reverses that order. flip swaps the two directions; Middleware is different because it wraps the whole parsing Effect rather than one present value.",
        code: `const normalize =\n  composeTransformation(\n    trim(),\n    toLowerCase()\n  )\n\n// decode: trim → lower\n// encode: lower.encode → trim.encode`,
        apis: [
            "composeTransformation",
            "Transformation.flip",
            "Middleware",
            "isTransformation",
        ],
        notice: "Composition is bidirectional algebra, not ordinary function piping: encode order is the reverse of decode order.",
    },
    Normalize: {
        eyebrow: "SOME TRANSFORMATIONS NORMALIZE; THEY DO NOT ROUND-TRIP BYTES",
        title: "Know when decoding intentionally throws information away",
        description:
            "trim, lower/upper case, and capitalization normalize decoded values while their encode side is passthrough. snakeToCamel has an explicit inverse. Passthrough variants change only typing relationships, not runtime values.",
        code: `const normalized =\n  S.String.pipe(\n    S.decode(\n      composeTransformation(\n        trim(),\n        toLowerCase()\n      )\n    )\n  )\n\ndecode("  HELLO  ") // "hello"`,
        apis: ["trim", "toLowerCase", "snakeToCamel", "passthrough"],
        notice: "A valid transformation need not preserve the original encoded spelling. Distinguish semantic round trips from byte-for-byte round trips.",
    },
    Convert: {
        eyebrow: "THE MODULE ALSO SHIPS READY-MADE BOUNDARY CONVERSIONS",
        title: "Reuse the built-ins before writing another codec",
        description:
            "Numeric, date/time, Duration, binary text, JSON, URL, FormData, option-like, and BigDecimal conversions are already modeled as Transformations and can be attached directly with Schema.decodeTo.",
        code: `const JsonText =\n  S.String.pipe(\n    S.decodeTo(\n      S.Unknown,\n      SchemaTransformation\n        .fromJsonString()\n    )\n  )\n\n// text ⇄ parsed JSON value`,
        apis: [
            "numberFromString",
            "durationFromString",
            "stringFromBase64String",
            "fromJsonString",
        ],
        notice: "Built-ins still carry their own semantics. For example, numberFromString follows Number coercion, while fallible codecs surface InvalidValue issues.",
    },
}

export const build_snapshot = (model: Model): Snapshot => {
    switch (model.buildCase) {
        case "Pure":
            return {
                input: "$2.50",
                operation: "transform · dollars ⇄ cents",
                result: "250 cents ⇄ 2.5 dollars",
                invariant:
                    "decode and encode are both synchronous and infallible",
                implementation:
                    "pure callbacks become a pair of Getter.transform values",
                guidance:
                    "Use transform when conversion cannot fail and needs no Effect services.",
            }

        case "Effectful":
            return {
                input: '"42" / "4.2" / "nope"',
                operation: "transformEffect · strict integer parser",
                result: "42 / InvalidValue / InvalidValue",
                invariant: "decode and encode may fail with SchemaIssue.Issue",
                implementation:
                    "rc.112 calls this transformOrFail; the live API names it transformEffect",
                guidance:
                    "Use this when validation, async work, or Effect services are part of conversion.",
            }

        case "Optional":
            return {
                input: 'missing name / Some("Ada")',
                operation: "transformOptional",
                result: 'Some("guest") / Some("Ada")',
                invariant: "Option.None means the key is absent",
                implementation:
                    "returning None omits the key in the output direction",
                guidance:
                    "Reach for Option-level transformation only when presence itself is semantic.",
            }

        case "Getters":
            return {
                input: "decode Getter + encode Getter",
                operation: "makeTransformation",
                result: "Transformation<number, string>",
                invariant:
                    "the two directional Getters remain visible on the Transformation",
                implementation:
                    "rc.112 exposes make; the live API exposes makeTransformation",
                guidance:
                    "Use this when the directional Getters already exist or need different service requirements.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Compose":
            return {
                input: '"  HELLO  "',
                operation: "trim ∘ toLowerCase",
                result: '"hello"',
                invariant: "decode runs first then second",
                implementation: "encode composes in reverse order",
                guidance:
                    "On the live API use composeTransformation; rc.112 used Transformation.compose.",
            }

        case "Flip":
            return {
                input: "numberFromString",
                operation: "Transformation.flip()",
                result: "Transformation<string, number>",
                invariant: "decode and encode swap roles",
                implementation:
                    "service requirements swap with their directions too",
                guidance:
                    "Flip when the same reversible conversion is needed from the opposite schema orientation.",
            }

        case "Direction":
            return {
                input: "A ⇄ B then B ⇄ C",
                operation: "composeTransformation(A→B, B→C)",
                result: "A ⇄ C",
                invariant: "decode: A→B→C · encode: C→B→A",
                implementation:
                    "the encode Getter order is reversed by construction",
                guidance:
                    "Check both directions whenever a normalization is lossy or an inverse is approximate.",
            }

        case "Middleware":
            return {
                input: "Effect<Option<E>, Issue, R>",
                operation: "Middleware.decode",
                result: "wrapped Effect<Option<T>, Issue, R>",
                invariant:
                    "middleware sees the full parse Effect, not just a present value",
                implementation:
                    "it can catch, retry, replace, or observe the inner parsing pipeline",
                guidance:
                    "Use Transformation for value conversion; use Middleware for pipeline-level recovery or instrumentation.",
            }
    }
}

export const normalize_snapshot = (model: Model): Snapshot => {
    switch (model.normalizeCase) {
        case "Trim":
            return {
                input: '"  hello  "',
                operation: "trim()",
                result: 'decode → "hello" · encode → "hello"',
                invariant: "leading/trailing whitespace is not recoverable",
                implementation: "decode trims; encode is passthrough",
                guidance:
                    "Treat trim as canonicalization, not a byte-preserving round trip.",
            }

        case "Case":
            return {
                input: '"HELLO" / "user_name"',
                operation: "toLowerCase / snakeToCamel",
                result: '"hello" / "userName"',
                invariant:
                    "case normalizers may be lossy; snake/camel has an explicit inverse",
                implementation:
                    "toLowerCase encode is passthrough; snakeToCamel encode uses camelToSnake",
                guidance:
                    "Choose an inverse that matches the actual external naming convention.",
            }

        case "Split":
            return {
                input: '"a=1,b=2"',
                operation: "splitKeyValue",
                result: '{ a: "1", b: "2" }',
                invariant:
                    "the paired encode joins the record back to delimited text",
                implementation:
                    "malformed pairs without both key and value are skipped",
                guidance:
                    "Use a real grammar when escaping, ordering, or duplicate keys matter.",
            }

        case "Passthrough":
            return {
                input: "same runtime value",
                operation: "passthrough / subtype / supertype",
                result: "same runtime value",
                invariant: "only the type relationship changes",
                implementation:
                    "the shared no-op transformation avoids conversion work",
                guidance:
                    "Use the typed passthrough variants instead of unsafe casts when schema sides already align structurally.",
            }
    }
}

export const convert_snapshot = (model: Model): Snapshot => {
    switch (model.convertCase) {
        case "Numeric":
            return {
                input: '"42" / 42n / decimal text',
                operation:
                    "numberFromString / bigintFromString / bigDecimalFromString",
                result: "numeric application values",
                invariant:
                    "each transformation defines its own coercion or validation semantics",
                implementation:
                    "numberFromString follows Number() coercion; bigint parsing can fail",
                guidance:
                    "Add schema checks when broad JavaScript coercion is looser than your wire contract.",
            }

        case "Time":
            return {
                input: '"2 seconds" / ISO date / zone string',
                operation:
                    "Duration / Date / DateTime / TimeZone transformations",
                result: "typed temporal values",
                invariant:
                    "invalid textual forms surface schema issues where the helper is fallible",
                implementation:
                    "separate helpers preserve the intended temporal type and wire form",
                guidance:
                    "Pick the narrowest temporal transformation that matches the external protocol.",
            }

        case "Encoding":
            return {
                input: '"aGVsbG8=" / hex / URI component',
                operation: "Base64 / hex / URI transformations",
                result: '"hello" or Uint8Array',
                invariant: "encode and decode use matching wire encodings",
                implementation:
                    "string and byte-array variants are distinct transformations",
                guidance:
                    "Keep binary/text boundaries explicit instead of silently converting through platform defaults.",
            }

        case "Structured":
            return {
                input: "JSON text / FormData / URLSearchParams",
                operation:
                    "fromJsonString / fromFormData / fromURLSearchParams",
                result: "structured application data",
                invariant: "the boundary representation is part of the schema",
                implementation:
                    "FormData and URLSearchParams use bracket-path tree conversion",
                guidance:
                    "Compose these with a structural target schema so parsing and domain validation remain separate steps.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaTransformationStage: {
        stage: Stage,
    },
    SelectedSchemaTransformationBuildCase: {
        buildCase: BuildCase,
    },
    SelectedSchemaTransformationComposeCase: {
        composeCase: ComposeCase,
    },
    SelectedSchemaTransformationNormalizeCase: {
        normalizeCase: NormalizeCase,
    },
    SelectedSchemaTransformationConvertCase: {
        convertCase: ConvertCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Pure",
    composeCase: "Compose",
    normalizeCase: "Trim",
    convertCase: "Structured",
})

type StagePayload = Readonly<{ stage: Stage }>
type BuildCasePayload = Readonly<{ buildCase: BuildCase }>
type ComposeCasePayload = Readonly<{ composeCase: ComposeCase }>
type NormalizeCasePayload = Readonly<{ normalizeCase: NormalizeCase }>
type ConvertCasePayload = Readonly<{ convertCase: ConvertCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaTransformationStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaTransformationBuildCase: ({
            buildCase,
        }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedSchemaTransformationComposeCase: ({
            composeCase,
        }: ComposeCasePayload) => ({
            model: evo(model, {
                composeCase: () => composeCase,
            }),
        }),

        SelectedSchemaTransformationNormalizeCase: ({
            normalizeCase,
        }: NormalizeCasePayload) => ({
            model: evo(model, {
                normalizeCase: () => normalizeCase,
            }),
        }),

        SelectedSchemaTransformationConvertCase: ({
            convertCase,
        }: ConvertCasePayload) => ({
            model: evo(model, {
                convertCase: () => convertCase,
            }),
        }),
    })
