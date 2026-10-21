import { Effect, Schema as S, StandardSchema } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL STANDARD SCHEMA PROGRAMS
// -----------------------------------------------------------------------------

export const Person = S.Struct({
    name: S.String,
    age: S.Number,
})

export const NumberFromString = S.NumberFromString

export const typed_contract: StandardSchema.StandardTypedV1<string, number> = {
    "~standard": {
        version: 1,
        vendor: "lesson",
    },
}

export const positive_integer_contract: StandardSchema.StandardSchemaV1<
    string,
    number
> = {
    "~standard": {
        version: 1,
        vendor: "lesson",
        validate: (
            value: unknown
        ): StandardSchema.StandardSchemaV1.Result<number> => {
            if (typeof value === "string" && /^\d+$/.test(value)) {
                return { value: Number(value) }
            }
            return {
                issues: [
                    {
                        message:
                            "Expected a string containing a non-negative integer",
                        path: [{ key: "value" }],
                    },
                ],
            }
        },
    },
}

export const async_contract: StandardSchema.StandardSchemaV1<string, string> = {
    "~standard": {
        version: 1,
        vendor: "lesson-async",
        validate: async (
            value: unknown
        ): Promise<StandardSchema.StandardSchemaV1.Result<string>> => {
            if (typeof value === "string" && value.length > 0) {
                return { value }
            }
            return { issues: [{ message: "Expected a non-empty string" }] }
        },
    },
}

export const effect_standard = S.toStandardSchemaV1(Person)
export const effect_standard_json = S.toStandardJSONSchemaV1(NumberFromString)

export type EffectPersonInput = StandardSchema.StandardSchemaV1.InferInput<
    typeof effect_standard
>
export type EffectPersonOutput = StandardSchema.StandardSchemaV1.InferOutput<
    typeof effect_standard
>

const normalize_path = (
    path:
        | ReadonlyArray<
              PropertyKey | StandardSchema.StandardSchemaV1.PathSegment
          >
        | undefined
): ReadonlyArray<PropertyKey> =>
    path?.map((segment) =>
        typeof segment === "object" && segment !== null && "key" in segment
            ? segment.key
            : segment
    ) ?? []

export const typed_program = Effect.sync(() => {
    const typed = typed_contract["~standard"]
    const effect = effect_standard["~standard"]

    return {
        typedVersion: typed.version,
        typedVendor: typed.vendor,
        typedHasRuntimeTypes: typed.types !== undefined,
        effectVersion: effect.version,
        effectVendor: effect.vendor,
        effectHasValidate: typeof effect.validate === "function",
    } as const
})

export const validate_program = Effect.sync(() => {
    const rawSuccess = positive_integer_contract["~standard"].validate("42")
    const rawFailure = positive_integer_contract["~standard"].validate("x")

    const effectSuccess = effect_standard["~standard"].validate({
        name: "Ada",
        age: 37,
    })
    const effectFailure = effect_standard["~standard"].validate({
        name: 1,
        age: "old",
    })

    return {
        rawSuccessIsPromise: rawSuccess instanceof Promise,
        rawFailureIsPromise: rawFailure instanceof Promise,
        effectSuccessIsPromise: effectSuccess instanceof Promise,
        effectFailureIsPromise: effectFailure instanceof Promise,
    } as const
})

export const issues_program = Effect.sync(() => {
    const result = effect_standard["~standard"].validate({
        name: 1,
        age: "old",
    })

    if (result instanceof Promise || !("issues" in result)) {
        return {
            synchronous: false,
            count: 0,
            firstMessage: "",
            firstPath: [] as ReadonlyArray<PropertyKey>,
        } as const
    }

    const first = result.issues[0]
    return {
        synchronous: true,
        count: result.issues.length,
        firstMessage: first?.message ?? "",
        firstPath: normalize_path(first?.path),
    } as const
})

export const json_program = Effect.sync(() => {
    const props = effect_standard_json["~standard"]
    const input2020 = props.jsonSchema.input({ target: "draft-2020-12" })
    const output2020 = props.jsonSchema.output({ target: "draft-2020-12" })
    const input07 = props.jsonSchema.input({ target: "draft-07" })

    return {
        vendor: props.vendor,
        inputType: input2020.type,
        outputType: output2020.type,
        draft07Type: input07.type,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Typed"),
    S.Literal("Validate"),
    S.Literal("Issues"),
    S.Literal("JSON"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Typed",
    "Validate",
    "Issues",
    "JSON",
]

export const TypedCase = S.Union([
    S.Literal("Base"),
    S.Literal("Infer"),
    S.Literal("Props"),
    S.Literal("Vendor"),
])
export type TypedCase = typeof TypedCase.Type
export const typed_cases: ReadonlyArray<TypedCase> = [
    "Base",
    "Infer",
    "Props",
    "Vendor",
]

export const ValidateCase = S.Union([
    S.Literal("Sync"),
    S.Literal("Async"),
    S.Literal("Effect"),
    S.Literal("Boundary"),
])
export type ValidateCase = typeof ValidateCase.Type
export const validate_cases: ReadonlyArray<ValidateCase> = [
    "Sync",
    "Async",
    "Effect",
    "Boundary",
]

export const IssuesCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Path"),
    S.Literal("Customize"),
])
export type IssuesCase = typeof IssuesCase.Type
export const issues_cases: ReadonlyArray<IssuesCase> = [
    "Success",
    "Failure",
    "Path",
    "Customize",
]

export const JsonCase = S.Union([
    S.Literal("Input"),
    S.Literal("Output"),
    S.Literal("Targets"),
    S.Literal("Limits"),
])
export type JsonCase = typeof JsonCase.Type
export const json_cases: ReadonlyArray<JsonCase> = [
    "Input",
    "Output",
    "Targets",
    "Limits",
]

export const Model = S.Struct({
    stage: Stage,
    typedCase: TypedCase,
    validateCase: ValidateCase,
    issuesCase: IssuesCase,
    jsonCase: JsonCase,
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
    Typed: {
        eyebrow: "three interoperable contracts share one ~standard property",
        title: "Start with the type contract before validation or JSON conversion",
        description:
            "StandardTypedV1 carries version, vendor, and optional compile-time input/output metadata. StandardSchemaV1 extends it with validate; StandardJSONSchemaV1 extends it with JSON Schema conversion. This module declares those contracts but does not implement runtime adapters.",
        code: `const typed: StandardSchema.StandardTypedV1<
    string,
    number
> = {
    "~standard": {
        version: 1,
        vendor: "lesson"
    }
}`,
        apis: [
            "StandardTypedV1",
            "StandardTypedV1.Props",
            "InferInput",
            "InferOutput",
        ],
        notice: "The optional types field exists for TypeScript inference; consumers must not depend on it being a useful runtime descriptor. The stable runtime handshake is the ~standard object and its declared methods.",
    },

    Validate: {
        eyebrow:
            "validate accepts unknown and may return immediately or asynchronously",
        title: "StandardSchemaV1 standardizes the validator boundary",
        description:
            "The generic Input/Output pair captures the schema's type relationship, while validate still accepts unknown at runtime. A validator may return Result<Output> directly or Promise<Result<Output>>. Effect exposes its own schemas through Schema.toStandardSchemaV1.",
        code: `const standard = S.toStandardSchemaV1(Person)

const result = standard["~standard"]
    .validate({ name: "Ada", age: 37 })

// sync schemas return a value
// async checks may return Promise<Result<...>>`,
        apis: [
            "StandardSchemaV1",
            "StandardSchemaV1.Result",
            "Schema.toStandardSchemaV1",
            "validate",
        ],
        notice: "Effect's adapter requires a schema with no decoding service requirements. It tries synchronous validation first and returns a Promise only when the schema actually needs asynchronous work.",
    },

    Issues: {
        eyebrow: "success is { value }; failure is { issues }",
        title: "Keep structured issue paths at the interop boundary",
        description:
            "FailureResult contains Issue objects with a message and optional path. A path segment can be a property key directly or an object containing key. Effect's Standard Schema adapter uses its SchemaIssue formatter to flatten internal issue trees into this portable shape.",
        code: `const result = standard["~standard"]
    .validate({ name: 1, age: "old" })

// failure:
// {
//   issues: [
//     { message: "Expected string", path: ["name"] }
//   ]
// }`,
        apis: [
            "FailureResult",
            "Issue",
            "PathSegment",
            "SchemaIssue formatter",
        ],
        notice: "Standard Schema issues are intentionally smaller than Effect's full SchemaIssue tree. Preserve the richer Effect issue internally when you need it; use Standard Schema output at the interoperability boundary.",
    },

    JSON: {
        eyebrow: "input and output JSON Schemas can describe different shapes",
        title: "StandardJSONSchemaV1 exposes both sides of a codec",
        description:
            "The jsonSchema converter has separate input and output methods because transforming schemas may accept one wire shape and produce another application shape. Targets are extensible by contract; an implementation may throw when a requested target is unsupported.",
        code: `const standard =
    S.toStandardJSONSchemaV1(S.NumberFromString)

standard["~standard"].jsonSchema.input({
    target: "draft-2020-12"
}) // { type: "string" }

standard["~standard"].jsonSchema.output({
    target: "draft-2020-12"
}) // { type: "number" }`,
        apis: [
            "StandardJSONSchemaV1",
            "Converter",
            "Target",
            "Schema.toStandardJSONSchemaV1",
        ],
        notice: "The Standard JSON Schema contract permits draft-2020-12, draft-07, openapi-3.0, and future string targets. Effect's rc.112 adapter implements draft-2020-12 and draft-07 and throws for unsupported targets.",
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

export const typed_snapshot = (model: Model): Snapshot => {
    switch (model.typedCase) {
        case "Base":
            return {
                input: "StandardTypedV1<string, number>",
                operation: 'read ["~standard"]',
                result: 'version 1 · vendor "lesson"',
                invariant:
                    "all Standard contracts share the same metadata entry point",
                implementation:
                    "types is optional and primarily supports type inference",
                guidance:
                    "Use StandardTypedV1 when a tool only needs portable type identity, not validation.",
            }
        case "Infer":
            return {
                input: "typeof Schema.toStandardSchemaV1(Person)",
                operation: "InferInput / InferOutput",
                result: "Encoded input type → decoded output type",
                invariant:
                    "input and output can differ for transforming schemas",
                implementation:
                    "inference reads the generic metadata carried by the contract",
                guidance:
                    "Prefer the inference helpers in generic integrations instead of reaching into vendor schema internals.",
            }
        case "Props":
            return {
                input: "~standard metadata",
                operation: "version + vendor + optional types",
                result: "portable library-neutral descriptor",
                invariant: "version is exactly 1 for the V1 contract",
                implementation:
                    "vendor is an arbitrary schema-library identifier",
                guidance:
                    "Feature-detect methods such as validate or jsonSchema rather than branching on vendor names.",
            }
        case "Vendor":
            return {
                input: "Effect schema adapter",
                operation: "Schema.toStandardSchemaV1",
                result: 'vendor = "effect"',
                invariant:
                    "the standard contract identifies the producer without prescribing its internals",
                implementation:
                    "Effect decorates the schema with a ~standard object",
                guidance:
                    "Treat vendor as metadata, not as a reason to bypass the portable contract.",
            }
    }
}

export const validate_snapshot = (model: Model): Snapshot => {
    switch (model.validateCase) {
        case "Sync":
            return {
                input: '{ name: "Ada", age: 37 }',
                operation: "validate(value)",
                result: "{ value: { name, age } }",
                invariant: "successful validation has value and no issues",
                implementation:
                    "Effect's adapter flushes a synchronous scheduler first",
                guidance:
                    "Handle both direct Result and Promise<Result> even when your current schema is synchronous.",
            }
        case "Async":
            return {
                input: "schema with asynchronous decode/check",
                operation: "validate(value)",
                result: "Promise<Result<Output>>",
                invariant:
                    "the Standard Schema contract permits asynchronous validation",
                implementation:
                    "Effect returns a Promise only when the validation fiber cannot finish synchronously",
                guidance:
                    "Normalize with Promise.resolve(result) in framework adapters that want one code path.",
            }
        case "Effect":
            return {
                input: "Effect Schema",
                operation: "Schema.toStandardSchemaV1(schema)",
                result: "original schema + portable validate contract",
                invariant:
                    "the returned object keeps the original Effect schema APIs",
                implementation:
                    "Effect adds validate to the schema's ~standard metadata",
                guidance:
                    "Use the adapter at third-party integration boundaries; keep native Schema APIs inside Effect code.",
            }
        case "Boundary":
            return {
                input: "Schema requiring decoding services",
                operation: "toStandardSchemaV1",
                result: "not accepted by the adapter type",
                invariant: "portable validate has no Effect service channel",
                implementation:
                    "Effect constrains the adapter to service-free decoders",
                guidance:
                    "Provide or eliminate decoding services before exporting a schema through Standard Schema V1.",
            }
    }
}

export const issues_snapshot = (model: Model): Snapshot => {
    switch (model.issuesCase) {
        case "Success":
            return {
                input: "valid unknown input",
                operation: "validate",
                result: "{ value }",
                invariant: "issues is absent/falsy on success",
                implementation:
                    "SuccessResult is structurally distinct from FailureResult",
                guidance:
                    'Narrow with "issues" in result or "value" in result; do not expect tagged unions.',
            }
        case "Failure":
            return {
                input: '{ name: 1, age: "old" }',
                operation: "validate",
                result: "{ issues: Issue[] }",
                invariant:
                    "a failure carries one or more portable issue messages",
                implementation:
                    "Effect flattens its SchemaIssue tree through the Standard Schema formatter",
                guidance:
                    "Render issues directly in forms or adapters that already understand the Standard Schema shape.",
            }
        case "Path":
            return {
                input: "nested validation failure",
                operation: "Issue.path",
                result: '["user", { key: "name" }, 0] style path',
                invariant: "path segments may be keys or { key } objects",
                implementation:
                    "the union preserves custom path-segment wrappers from validators",
                guidance:
                    "Normalize both forms before passing paths to UI libraries that expect only property keys.",
            }
        case "Customize":
            return {
                input: "Effect Schema + formatter hooks",
                operation: "toStandardSchemaV1(schema, options)",
                result: "custom portable issue messages",
                invariant:
                    "format customization belongs to the adapter boundary",
                implementation:
                    "leafHook, checkHook, and parseOptions feed Effect's Standard Schema formatter",
                guidance:
                    "Keep machine-readable paths stable even when customizing human-facing messages.",
            }
    }
}

export const json_snapshot = (model: Model): Snapshot => {
    switch (model.jsonCase) {
        case "Input":
            return {
                input: "NumberFromString encoded side",
                operation: 'jsonSchema.input({ target: "draft-2020-12" })',
                result: '{ type: "string" }',
                invariant:
                    "input describes values accepted at the wire boundary",
                implementation:
                    "Effect compiles the schema's canonical encoded JSON representation",
                guidance:
                    "Use input when documenting API/request payloads that arrive before decoding.",
            }
        case "Output":
            return {
                input: "NumberFromString decoded side",
                operation: 'jsonSchema.output({ target: "draft-2020-12" })',
                result: '{ type: "number" }',
                invariant:
                    "output may differ from input for codecs and transformations",
                implementation:
                    "Effect converts the Type side before compiling JSON Schema",
                guidance:
                    "Use output when a consumer needs the post-validation application shape.",
            }
        case "Targets":
            return {
                input: "StandardJSONSchemaV1.Target",
                operation: "request a JSON Schema dialect",
                result: "draft-2020-12 · draft-07 · openapi-3.0 · future strings",
                invariant: "the spec is open to additional target identifiers",
                implementation: "support remains implementation-specific",
                guidance:
                    "Expect converter methods to throw for targets a schema library cannot generate.",
            }
        case "Limits":
            return {
                input: 'target = "openapi-3.0"',
                operation: "Effect rc.112 jsonSchema.input",
                result: "throws Unsupported target",
                invariant:
                    "type-level allowance does not imply implementation support",
                implementation:
                    "Effect's adapter currently handles draft-2020-12 and draft-07",
                guidance:
                    "Feature-test or catch conversion errors when target support varies across vendors.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedStandardSchemaStage: { stage: Stage },
    SelectedStandardSchemaTypedCase: { typedCase: TypedCase },
    SelectedStandardSchemaValidateCase: { validateCase: ValidateCase },
    SelectedStandardSchemaIssuesCase: { issuesCase: IssuesCase },
    SelectedStandardSchemaJsonCase: { jsonCase: JsonCase },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Typed",
    typedCase: "Base",
    validateCase: "Sync",
    issuesCase: "Failure",
    jsonCase: "Input",
})

type StagePayload = Readonly<{ stage: Stage }>
type TypedCasePayload = Readonly<{ typedCase: TypedCase }>
type ValidateCasePayload = Readonly<{ validateCase: ValidateCase }>
type IssuesCasePayload = Readonly<{ issuesCase: IssuesCase }>
type JsonCasePayload = Readonly<{ jsonCase: JsonCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedStandardSchemaStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedStandardSchemaTypedCase: ({ typedCase }: TypedCasePayload) => ({
            model: evo(model, { typedCase: () => typedCase }),
        }),
        SelectedStandardSchemaValidateCase: ({
            validateCase,
        }: ValidateCasePayload) => ({
            model: evo(model, { validateCase: () => validateCase }),
        }),
        SelectedStandardSchemaIssuesCase: ({
            issuesCase,
        }: IssuesCasePayload) => ({
            model: evo(model, { issuesCase: () => issuesCase }),
        }),
        SelectedStandardSchemaJsonCase: ({ jsonCase }: JsonCasePayload) => ({
            model: evo(model, { jsonCase: () => jsonCase }),
        }),
    })
