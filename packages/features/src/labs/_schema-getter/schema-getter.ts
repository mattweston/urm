import {
    Effect,
    Option,
    Schema as S,
    SchemaGetter,
    type SchemaAST,
    SchemaIssue,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// VERSION-BRIDGED GETTER OPERATIONS
// -----------------------------------------------------------------------------

/**
 * URM is pinned to Effect 4.0.0-rc.112, where Getter has instance
 * run / map / compose methods. The live rc.116 API moved those operations to
 * standalone SchemaGetter functions. These tiny adapters keep the teaching
 * examples valid on the workspace pin while documenting the live API shape.
 */
type GetterRun<T, E, R> = (
    getter: SchemaGetter.Getter<T, E, R>,
    input: Option.Option<E>,
    options: SchemaAST.ParseOptions
) => Effect.Effect<Option.Option<T>, SchemaIssue.Issue, R>

type LegacyGetterRun<T, E, R> = Readonly<{
    run: (
        input: Option.Option<E>,
        options: SchemaAST.ParseOptions
    ) => Effect.Effect<Option.Option<T>, SchemaIssue.Issue, R>
}>

export const run_getter = <T, E, R>(
    getter: SchemaGetter.Getter<T, E, R>,
    input: Option.Option<E>,
    options: SchemaAST.ParseOptions = {}
): Effect.Effect<Option.Option<T>, SchemaIssue.Issue, R> => {
    const legacy = getter as unknown as Partial<LegacyGetterRun<T, E, R>>

    if (typeof legacy.run === "function") {
        return legacy.run(input, options)
    }

    const modern = SchemaGetter as unknown as Readonly<{
        run: GetterRun<T, E, R>
    }>

    return modern.run(getter, input, options)
}

type LegacyGetterMap<T, E, R> = Readonly<{
    map: <T2>(f: (value: T) => T2) => SchemaGetter.Getter<T2, E, R>
}>

export const map_getter = <T, E, R, T2>(
    getter: SchemaGetter.Getter<T, E, R>,
    f: (value: T) => T2
): SchemaGetter.Getter<T2, E, R> => {
    const legacy = getter as unknown as Partial<LegacyGetterMap<T, E, R>>

    if (typeof legacy.map === "function") {
        return legacy.map(f)
    }

    const modern = SchemaGetter as unknown as Readonly<{
        map: (
            self: SchemaGetter.Getter<T, E, R>,
            transform: (value: T) => T2
        ) => SchemaGetter.Getter<T2, E, R>
    }>

    return modern.map(getter, f)
}

type LegacyGetterCompose<T, E, R> = Readonly<{
    compose: <T2, R2>(
        other: SchemaGetter.Getter<T2, T, R2>
    ) => SchemaGetter.Getter<T2, E, R | R2>
}>

export const compose_getter = <T, E, R, T2, R2>(
    first: SchemaGetter.Getter<T, E, R>,
    second: SchemaGetter.Getter<T2, T, R2>
): SchemaGetter.Getter<T2, E, R | R2> => {
    const legacy = first as unknown as Partial<LegacyGetterCompose<T, E, R>>

    if (typeof legacy.compose === "function") {
        return legacy.compose(second)
    }

    const modern = SchemaGetter as unknown as Readonly<{
        compose: (
            self: SchemaGetter.Getter<T, E, R>,
            other: SchemaGetter.Getter<T2, T, R2>
        ) => SchemaGetter.Getter<T2, E, R | R2>
    }>

    return modern.compose(first, second)
}

// -----------------------------------------------------------------------------
// REAL SCHEMA GETTER EXAMPLES
// -----------------------------------------------------------------------------

export const parse_number = SchemaGetter.transform<number, string>(
    (input: string): number => globalThis.Number(input)
)

export const double_number = SchemaGetter.transform<number, number>(
    (input: number): number => input * 2
)

export const parse_then_double = compose_getter(parse_number, double_number)

export const parse_then_increment = map_getter(
    parse_number,
    (value: number): number => value + 1
)

const option_number = (
    effect: Effect.Effect<Option.Option<number>, SchemaIssue.Issue>
): number | undefined => {
    const result = Effect.runSync(effect)

    return Option.isSome(result) ? result.value : undefined
}

export const run_some_example = (): number | undefined =>
    option_number(run_getter(parse_number, Option.some("21")))

export const run_none_example = (): number | undefined =>
    option_number(run_getter(parse_number, Option.none()))

export const compose_example = (): number | undefined =>
    option_number(run_getter(parse_then_double, Option.some("21")))

export const map_example = (): number | undefined =>
    option_number(run_getter(parse_then_increment, Option.some("21")))

export const passthrough_example = (): string | undefined => {
    const getter = SchemaGetter.passthrough<string>()
    const result = Effect.runSync(run_getter(getter, Option.some("unchanged")))

    return Option.isSome(result) ? result.value : undefined
}

export const trimmed_optional = SchemaGetter.transformOptional<string, string>(
    (input: Option.Option<string>) => {
        if (Option.isNone(input)) {
            return input
        }

        const value = input.value.trim()

        return value.length > 0 ? Option.some(value) : Option.none()
    }
)

export const default_name = SchemaGetter.withDefault(
    Effect.succeed("anonymous")
)

export const omitted_string = SchemaGetter.omit<string>()

export const optional_transform_example = (): Readonly<{
    present: string | undefined
    blank: string | undefined
    missing: string | undefined
}> => {
    const present = Effect.runSync(
        run_getter(trimmed_optional, Option.some("  Alice  "))
    )
    const blank = Effect.runSync(
        run_getter(trimmed_optional, Option.some("   "))
    )
    const missing = Effect.runSync(run_getter(trimmed_optional, Option.none()))

    return {
        present: Option.isSome(present) ? present.value : undefined,
        blank: Option.isSome(blank) ? blank.value : undefined,
        missing: Option.isSome(missing) ? missing.value : undefined,
    }
}

export const default_example = (): Readonly<{
    missing: string
    undefinedValue: string
    present: string
}> => {
    const read = (input: Option.Option<string | undefined>): string => {
        const result = Effect.runSync(run_getter(default_name, input))

        return Option.isSome(result) ? result.value : "<none>"
    }

    return {
        missing: read(Option.none()),
        undefinedValue: read(Option.some(undefined)),
        present: read(Option.some("Ada")),
    }
}

export const omit_example = (): boolean => {
    const result = Effect.runSync(
        run_getter(omitted_string, Option.some("secret"))
    )

    return Option.isNone(result)
}

export const required_string = SchemaGetter.required<string>()

export const non_negative = SchemaGetter.checkEffect<number>((input: number) =>
    Effect.succeed(input >= 0 ? undefined : "must be non-negative")
)

export const forbidden_string = SchemaGetter.forbidden<string, string>(
    () => "this direction is disabled"
)

const exit_tag = <T>(effect: Effect.Effect<T, SchemaIssue.Issue>): string =>
    Effect.runSync(Effect.exit(effect))._tag

export const required_example = (): Readonly<{
    present: string
    missing: string
}> => ({
    present: exit_tag(run_getter(required_string, Option.some("value"))),
    missing: exit_tag(run_getter(required_string, Option.none())),
})

export const check_example = (): Readonly<{
    positive: string
    negative: string
}> => ({
    positive: exit_tag(run_getter(non_negative, Option.some(1))),
    negative: exit_tag(run_getter(non_negative, Option.some(-1))),
})

export const forbidden_example = (): string =>
    exit_tag(run_getter(forbidden_string, Option.some("blocked")))

export const json_decode_example = (): string => {
    const result = Effect.runSync(
        run_getter(SchemaGetter.parseJson<string>(), Option.some('{"a":1}'))
    )

    return Option.isSome(result) ? JSON.stringify(result.value) : "<none>"
}

export const json_encode_example = (): string | undefined => {
    const result = Effect.runSync(
        run_getter(
            SchemaGetter.stringifyJson(),
            Option.some({
                a: 1,
            })
        )
    )

    return Option.isSome(result) ? result.value : undefined
}

export const text_conversion_example = (): Readonly<{
    trimmed: string
    keyValue: string
    split: string
}> => {
    const trimmed = Effect.runSync(
        run_getter(SchemaGetter.trim<string>(), Option.some("  hello  "))
    )
    const keyValue = Effect.runSync(
        run_getter(
            SchemaGetter.joinKeyValue(),
            Option.some({
                a: "1",
                b: "2",
            })
        )
    )
    const split = Effect.runSync(
        run_getter(SchemaGetter.split<string>(), Option.some("a,b,c"))
    )

    return {
        trimmed: Option.isSome(trimmed) ? trimmed.value : "<none>",
        keyValue: Option.isSome(keyValue) ? keyValue.value : "<none>",
        split: Option.isSome(split) ? split.value.join(" | ") : "<none>",
    }
}

export const binary_conversion_example = (): Readonly<{
    base64: string
    uri: string
}> => {
    const base64 = Effect.runSync(
        run_getter(
            SchemaGetter.decodeBase64String<string>(),
            Option.some("aGVsbG8=")
        )
    )
    const uri = Effect.runSync(
        run_getter(
            SchemaGetter.decodeUriComponent<string>(),
            Option.some("hello%20world")
        )
    )

    return {
        base64: Option.isSome(base64) ? base64.value : "<none>",
        uri: Option.isSome(uri) ? uri.value : "<none>",
    }
}

export const tree_conversion_example = (): Readonly<{
    built: string
    flattened: string
    query: string
}> => {
    const built = SchemaGetter.makeTreeRecord([
        ["user[name]", "Alice"],
        ["user[tags][]", "admin"],
        ["user[tags][]", "editor"],
    ])

    const flatten = SchemaGetter.collectBracketPathEntries(
        (value: unknown): value is string => typeof value === "string"
    )

    const flattened = flatten({
        user: {
            name: "Alice",
            tags: ["admin", "editor"],
        },
    })

    const queryResult = Effect.runSync(
        run_getter(
            SchemaGetter.decodeURLSearchParams(),
            Option.some(new URLSearchParams("user[name]=Alice"))
        )
    )

    return {
        built: JSON.stringify(built),
        flattened: flattened
            .map(([key, value]: [string, string]) => `${key}=${value}`)
            .join(" & "),
        query: Option.isSome(queryResult)
            ? JSON.stringify(queryResult.value)
            : "<none>",
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Run"),
    S.Literal("Transform"),
    S.Literal("Validate"),
    S.Literal("Convert"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Run",
    "Transform",
    "Validate",
    "Convert",
]

export const RunCase = S.Union([
    S.Literal("Some"),
    S.Literal("None"),
    S.Literal("Compose"),
    S.Literal("Version"),
])
export type RunCase = typeof RunCase.Type

export const run_cases: ReadonlyArray<RunCase> = [
    "Some",
    "None",
    "Compose",
    "Version",
]

export const TransformCase = S.Union([
    S.Literal("Pure"),
    S.Literal("Optional"),
    S.Literal("Default"),
    S.Literal("Omit"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "Pure",
    "Optional",
    "Default",
    "Omit",
]

export const ValidateCase = S.Union([
    S.Literal("Required"),
    S.Literal("Check"),
    S.Literal("Forbidden"),
    S.Literal("Issue"),
])
export type ValidateCase = typeof ValidateCase.Type

export const validate_cases: ReadonlyArray<ValidateCase> = [
    "Required",
    "Check",
    "Forbidden",
    "Issue",
]

export const ConvertCase = S.Union([
    S.Literal("Json"),
    S.Literal("Text"),
    S.Literal("Binary"),
    S.Literal("Forms"),
])
export type ConvertCase = typeof ConvertCase.Type

export const convert_cases: ReadonlyArray<ConvertCase> = [
    "Json",
    "Text",
    "Binary",
    "Forms",
]

export const Model = S.Struct({
    stage: Stage,
    runCase: RunCase,
    transformCase: TransformCase,
    validateCase: ValidateCase,
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

export const stage_details: Record<Stage, StageDetails> = {
    Run: {
        eyebrow:
            "a getter transforms an optional encoded value into an effectful optional decoded value",
        title: "Treat missing input as part of the conversion contract",
        description:
            "Getter<T, E, R> models Option<E> → Effect<Option<T>, Issue, R>. Some values can be transformed, None can remain missing or be handled explicitly, and composition chains one decoded value into the next conversion. URM's rc.112 exposes run / map / compose as Getter methods; live rc.116 exposes them as standalone SchemaGetter functions.",
        code: `const parseNumber =
    SchemaGetter.transform<
        number,
        string
    >(Number)

// URM / rc.112
parseNumber.run(
    Option.some("21"),
    {}
)

// live rc.116
SchemaGetter.run(
    parseNumber,
    Option.some("21"),
    {}
)`,
        apis: [
            "SchemaGetter.Getter",
            "Getter.run · rc.112",
            "SchemaGetter.run · rc.116",
            "SchemaGetter.compose",
            "SchemaGetter.map",
        ],
        notice: "The generated module uses small adapters for run / map / compose so the examples describe both the workspace pin and the live rc.116 API without changing the repository version.",
    },

    Transform: {
        eyebrow:
            "pure transforms, option-aware transforms, defaults, and omission",
        title: "Choose the smallest getter that matches the shape of the transformation",
        description:
            "transform changes present values and leaves None alone. transformOptional sees the full Option and can create or remove presence. withDefault fills a missing key or a present undefined value. omit always returns None. succeed ignores input and always produces a fixed Some value.",
        code: `const clean =
    SchemaGetter
        .transformOptional<
            string,
            string
        >(input => {
            if (Option.isNone(input)) {
                return input
            }
            const value =
                input.value.trim()
            return value.length > 0
                ? Option.some(value)
                : Option.none()
        })

const fallback =
    SchemaGetter.withDefault(
        Effect.succeed("anonymous")
    )`,
        apis: [
            "SchemaGetter.transform",
            "SchemaGetter.transformOptional",
            "SchemaGetter.withDefault",
            "SchemaGetter.omit",
            "SchemaGetter.succeed",
        ],
        notice: "withDefault is broader than a missing-key fallback: it also replaces Some(undefined). Use option-aware transforms when missing and present-but-undefined need different semantics.",
    },

    Validate: {
        eyebrow: "schema issues live in the getter error channel",
        title: "Validate without losing typed issue information",
        description:
            "required fails only when the encoded key is absent. checkEffect validates present values and can require Effect services. fail and forbidden reject unconditionally with SchemaIssue values. Validation getters preserve a successful input instead of transforming it into a different type.",
        code: `const nonNegative =
    SchemaGetter.checkEffect<number>(
        value =>
            Effect.succeed(
                value >= 0
                    ? undefined
                    : "must be non-negative"
            )
    )

const required =
    SchemaGetter.required<string>()`,
        apis: [
            "SchemaGetter.required",
            "SchemaGetter.checkEffect",
            "SchemaGetter.fail",
            "SchemaGetter.forbidden",
            "SchemaIssue.Issue",
        ],
        notice: "A Getter reports SchemaIssue.Issue, not arbitrary application errors. Effectful checks can require services, but their validation outcome is translated into schema issues.",
    },

    Convert: {
        eyebrow:
            "the module includes ready-made one-way codecs for common boundary data",
        title: "Reuse the built-in conversions before writing custom getters",
        description:
            "SchemaGetter includes coercions, string normalization, JSON, delimited text, Base64 / Base64Url / hex, URI components, DateTime inputs, FormData, URLSearchParams, and bracket-path tree helpers. These are one-way building blocks intended to be paired by Schema transformations.",
        code: `const json =
    SchemaGetter.parseJson<string>()

const base64 =
    SchemaGetter
        .decodeBase64String<string>()

const query =
    SchemaGetter
        .decodeURLSearchParams()

SchemaGetter.makeTreeRecord([
    ["user[name]", "Alice"],
    ["user[tags][]", "admin"]
])`,
        apis: [
            "SchemaGetter.parseJson",
            "SchemaGetter.stringifyJson",
            "SchemaGetter.decodeBase64String",
            "SchemaGetter.decodeURLSearchParams",
            "SchemaGetter.makeTreeRecord",
        ],
        notice: "Several coercion getters intentionally mirror JavaScript constructors. Number and Date can produce NaN / invalid dates, while decoding helpers such as Base64 and URI component decoders validate and fail with schema issues.",
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

export const run_snapshot = (model: Model): Snapshot => {
    switch (model.runCase) {
        case "Some":
            return {
                input: 'Option.some("21")',
                operation: "transform(Number)",
                result: "Option.some(21)",
                invariant: "Getter receives Option<E>",
                implementation:
                    "present values flow through the transformation",
                guidance: "Use transform for pure present-value conversions.",
            }

        case "None":
            return {
                input: "Option.none()",
                operation: "transform(Number)",
                result: "Option.none()",
                invariant: "ordinary transforms skip missing values",
                implementation: "None is not converted into undefined",
                guidance:
                    "Use transformOptional or a defaulting getter when absence itself needs handling.",
            }

        case "Compose":
            return {
                input: 'Some("21")',
                operation: "parse number → double",
                result: "Some(42)",
                invariant:
                    "the first decoded type must feed the second encoded type",
                implementation: "passthrough composition is optimized away",
                guidance:
                    "Compose small one-way conversions instead of hiding multiple boundary rules in one callback.",
            }

        case "Version":
            return {
                input: "workspace rc.112 ↔ live rc.116",
                operation:
                    "same Getter concept · different public operation shape",
                result: "instance methods → standalone functions",
                invariant:
                    "conversion semantics remain Option + Effect + Issue",
                implementation:
                    "rc.116 Getter is a tagged union and no longer constructible as a class",
                guidance:
                    "When upgrading, replace getter.run/map/compose and onSome/onNone/transformOrFail with the new standalone APIs.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "Pure":
            return {
                input: 'Some("21")',
                operation: "transform(Number)",
                result: "Some(21)",
                invariant: "pure transform cannot fail",
                implementation: "None bypasses the callback",
                guidance:
                    "Use transform for the common one-value-in / one-value-out case.",
            }

        case "Optional":
            return {
                input: 'Some("   ")',
                operation: "transformOptional(trim / filter)",
                result: "None",
                invariant: "the callback owns presence as well as value",
                implementation: "Some can become None and None can become Some",
                guidance:
                    "Use this for omission or option-level normalization, not ordinary mapping.",
            }

        case "Default":
            return {
                input: "None or Some(undefined)",
                operation: 'withDefault(succeed("anonymous"))',
                result: 'Some("anonymous")',
                invariant: "undefined is treated like missing",
                implementation: "a present non-undefined value passes through",
                guidance:
                    "Use onNone-style logic only when absent key and explicit undefined must differ on rc.112.",
            }

        case "Omit":
            return {
                input: 'Some("secret")',
                operation: "omit()",
                result: "None",
                invariant: "omission is successful conversion, not failure",
                implementation: "the input value is discarded",
                guidance:
                    "Use forbidden when the direction should fail instead of silently omitting a value.",
            }
    }
}

export const validate_snapshot = (model: Model): Snapshot => {
    switch (model.validateCase) {
        case "Required":
            return {
                input: "Option.none()",
                operation: "required()",
                result: "Failure · MissingKey",
                invariant: "required only cares about key absence",
                implementation: "Some(value) passes through unchanged",
                guidance:
                    "Combine required with a value check when presence and content both matter.",
            }

        case "Check":
            return {
                input: "Some(-1)",
                operation: "checkEffect(nonNegative)",
                result: "Failure · schema issue",
                invariant: "successful validation preserves the original value",
                implementation:
                    "undefined / true means valid; false / string / issue means invalid",
                guidance:
                    "Use checkEffect when validation needs Effect services or asynchronous work.",
            }

        case "Forbidden":
            return {
                input: "any Some / None input",
                operation: "forbidden(message)",
                result: "Failure · Forbidden",
                invariant:
                    "the conversion direction is intentionally unavailable",
                implementation:
                    "the message can inspect the original Option input",
                guidance:
                    "This is useful for intentionally one-way schema transformations.",
            }

        case "Issue":
            return {
                input: "custom validation outcome",
                operation: "fail / checkEffect",
                result: "SchemaIssue.Issue in the error channel",
                invariant: "Getter errors are schema issues",
                implementation:
                    "parse options are available when constructing detailed issues",
                guidance:
                    "Keep application-domain failures outside Getter unless they are deliberately translated into schema validation issues.",
            }
    }
}

export const convert_snapshot = (model: Model): Snapshot => {
    switch (model.convertCase) {
        case "Json":
            return {
                input: '"{\\"a\\":1}"',
                operation: "parseJson ↔ stringifyJson",
                result: '{ a: 1 } ↔ "{\\"a\\":1}"',
                invariant: "invalid JSON becomes a schema issue",
                implementation:
                    "stringify also fails when JSON.stringify cannot produce text",
                guidance:
                    "Pair these getters for a JSON text transformation rather than calling JSON.parse/stringify ad hoc in schema definitions.",
            }

        case "Text":
            return {
                input: '" a=1,b=2 "',
                operation: "trim / splitKeyValue / joinKeyValue / split",
                result: "normalized strings and records",
                invariant: "these helpers are pure one-way conversions",
                implementation:
                    "splitKeyValue skips malformed pairs missing key or value",
                guidance:
                    "Choose a structured parser when delimiter escaping or round-trip fidelity is required.",
            }

        case "Binary":
            return {
                input: '"aGVsbG8=" / "hello%20world"',
                operation: "Base64 / hex / URI decoders",
                result: '"hello" / "hello world"',
                invariant: "invalid encodings fail with InvalidValue",
                implementation: "byte and string variants are separate getters",
                guidance:
                    "Use the matching encode/decode pair so the wire representation is explicit in the schema transformation.",
            }

        case "Forms":
            return {
                input: "user[name]=Alice · user[tags][]=admin",
                operation: "URLSearchParams / FormData ↔ bracket-path tree",
                result: "nested TreeRecord",
                invariant: "bracket paths describe object / array structure",
                implementation:
                    "path delimiters are not escaped, so the format is intentionally lossy for keys containing them",
                guidance:
                    "Use makeTreeRecord / collectBracketPathEntries when building a custom boundary codec around the same notation.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaGetterStage: {
        stage: Stage,
    },
    SelectedSchemaGetterRunCase: {
        runCase: RunCase,
    },
    SelectedSchemaGetterTransformCase: {
        transformCase: TransformCase,
    },
    SelectedSchemaGetterValidateCase: {
        validateCase: ValidateCase,
    },
    SelectedSchemaGetterConvertCase: {
        convertCase: ConvertCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Run",
    runCase: "Some",
    transformCase: "Pure",
    validateCase: "Required",
    convertCase: "Json",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type RunCasePayload = Readonly<{
    runCase: RunCase
}>
type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>
type ValidateCasePayload = Readonly<{
    validateCase: ValidateCase
}>
type ConvertCasePayload = Readonly<{
    convertCase: ConvertCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaGetterStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaGetterRunCase: ({ runCase }: RunCasePayload) => ({
            model: modifyFields(model, {
                runCase: () => runCase,
            }),
        }),

        SelectedSchemaGetterTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: modifyFields(model, {
                transformCase: () => transformCase,
            }),
        }),

        SelectedSchemaGetterValidateCase: ({
            validateCase,
        }: ValidateCasePayload) => ({
            model: modifyFields(model, {
                validateCase: () => validateCase,
            }),
        }),

        SelectedSchemaGetterConvertCase: ({
            convertCase,
        }: ConvertCasePayload) => ({
            model: modifyFields(model, {
                convertCase: () => convertCase,
            }),
        }),
    })
