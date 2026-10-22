import {
    Exit,
    Option,
    Result,
    Schema as S,
    SchemaIssue,
    SchemaParser,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCHEMA PARSER EXAMPLES
// -----------------------------------------------------------------------------

export const Person = S.Struct({
    name: S.String,
    age: S.Number,
})
export type Person = typeof Person.Type

export const NumberFromString = S.NumberFromString

export const make_person = SchemaParser.make(Person)

export const make_person_effect = SchemaParser.makeEffect(Person)

export const make_person_option = SchemaParser.makeOption(Person)

export const made_person = make_person({
    name: "Ada",
    age: 36,
})

export const made_person_option = make_person_option({
    name: "Ada",
    age: 36,
})

export const is_person = SchemaParser.is(Person)

export const assert_person = (input: unknown): Person => {
    SchemaParser.asserts(Person, input)

    return input
}

export const decode_unknown_effect = (input: unknown) =>
    SchemaParser.decodeUnknownEffect(NumberFromString)(input)

export const decode_typed_effect = (input: string) =>
    SchemaParser.decodeEffect(NumberFromString)(input)

export const decode_unknown_promise = (input: unknown): Promise<number> =>
    SchemaParser.decodeUnknownPromise(NumberFromString)(input)

export const decode_typed_promise = (input: string): Promise<number> =>
    SchemaParser.decodePromise(NumberFromString)(input)

export const decode_unknown_exit = (input: unknown) =>
    SchemaParser.decodeUnknownExit(NumberFromString)(input)

export const decode_typed_exit = (input: string) =>
    SchemaParser.decodeExit(NumberFromString)(input)

export const decode_unknown_result = (input: unknown) =>
    SchemaParser.decodeUnknownResult(NumberFromString)(input)

export const decode_typed_result = (input: string) =>
    SchemaParser.decodeResult(NumberFromString)(input)

export const decode_unknown_sync = (input: unknown): number =>
    SchemaParser.decodeUnknownSync(NumberFromString)(input)

export const decode_typed_sync = (input: string): number =>
    SchemaParser.decodeSync(NumberFromString)(input)

export const encode_unknown_effect = (input: unknown) =>
    SchemaParser.encodeUnknownEffect(NumberFromString)(input)

export const encode_typed_effect = (input: number) =>
    SchemaParser.encodeEffect(NumberFromString)(input)

export const encode_unknown_promise = (input: unknown): Promise<string> =>
    SchemaParser.encodeUnknownPromise(NumberFromString)(input)

export const encode_typed_promise = (input: number): Promise<string> =>
    SchemaParser.encodePromise(NumberFromString)(input)

export const encode_unknown_exit = (input: unknown) =>
    SchemaParser.encodeUnknownExit(NumberFromString)(input)

export const encode_typed_exit = (input: number) =>
    SchemaParser.encodeExit(NumberFromString)(input)

export const encode_unknown_result = (input: unknown) =>
    SchemaParser.encodeUnknownResult(NumberFromString)(input)

export const encode_typed_result = (input: number) =>
    SchemaParser.encodeResult(NumberFromString)(input)

export const encode_unknown_sync = (input: unknown): string =>
    SchemaParser.encodeUnknownSync(NumberFromString)(input)

export const encode_typed_sync = (input: number): string =>
    SchemaParser.encodeSync(NumberFromString)(input)

export const strict_person_result = SchemaParser.decodeUnknownResult(Person, {
    errors: "all",
    onExcessProperty: "error",
    reportInput: true,
})({
    name: 42,
    age: "old",
    extra: true,
})

export const strict_person_summary = (): Readonly<{
    tag: string
    formatted: string
}> => {
    if (Result.isSuccess(strict_person_result)) {
        return {
            tag: "Success",
            formatted: JSON.stringify(strict_person_result.success),
        }
    }

    return {
        tag: "Failure",
        formatted: SchemaIssue.makeFormatterDefault()(
            strict_person_result.failure
        ),
    }
}

export const decode_exit_summary = (input: unknown): string => {
    const exit = decode_unknown_exit(input)

    return Exit.isSuccess(exit)
        ? `Success(${String(exit.value)})`
        : "Failure(SchemaIssue)"
}

export const make_option_summary = (): string =>
    Option.isSome(made_person_option) ? "Some(Person)" : "None"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Decode"),
    S.Literal("Encode"),
    S.Literal("Boundary"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Decode",
    "Encode",
    "Boundary",
]

export const ConstructCase = S.Union([
    S.Literal("Sync"),
    S.Literal("Effect"),
    S.Literal("Option"),
    S.Literal("Guards"),
])
export type ConstructCase = typeof ConstructCase.Type

export const construct_cases: ReadonlyArray<ConstructCase> = [
    "Sync",
    "Effect",
    "Option",
    "Guards",
]

export const DecodeCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Promise"),
    S.Literal("Exit"),
    S.Literal("Result"),
    S.Literal("Sync"),
])
export type DecodeCase = typeof DecodeCase.Type

export const decode_cases: ReadonlyArray<DecodeCase> = [
    "Effect",
    "Promise",
    "Exit",
    "Result",
    "Sync",
]

export const EncodeCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Promise"),
    S.Literal("Exit"),
    S.Literal("Result"),
    S.Literal("Sync"),
])
export type EncodeCase = typeof EncodeCase.Type

export const encode_cases: ReadonlyArray<EncodeCase> = [
    "Effect",
    "Promise",
    "Exit",
    "Result",
    "Sync",
]

export const BoundaryCase = S.Union([
    S.Literal("Unknown"),
    S.Literal("Typed"),
    S.Literal("Options"),
    S.Literal("Failure"),
])
export type BoundaryCase = typeof BoundaryCase.Type

export const boundary_cases: ReadonlyArray<BoundaryCase> = [
    "Unknown",
    "Typed",
    "Options",
    "Failure",
]

export const Model = S.Struct({
    stage: Stage,
    constructCase: ConstructCase,
    decodeCase: DecodeCase,
    encodeCase: EncodeCase,
    boundaryCase: BoundaryCase,
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
    Construct: {
        eyebrow:
            "constructor input → decoded Type, with three failure surfaces",
        title: "Choose whether construction throws, fails in Effect, or collapses to Option",
        description:
            "make, makeEffect, and makeOption all construct the schema's decoded Type side. They differ only in how validation failure crosses the boundary. is and asserts validate an already-decoded value without running the encoded transformation direction.",
        code: `const Person = Schema.Struct({
    name: Schema.String,
    age: Schema.Number
})

SchemaParser.make(Person)(input)
// Type or throws

SchemaParser.makeEffect(Person)(input)
// Effect<Type, Issue>

SchemaParser.makeOption(Person)(input)
// Option<Type>`,
        apis: [
            "SchemaParser.make",
            "SchemaParser.makeEffect",
            "SchemaParser.makeOption",
            "SchemaParser.is",
            "SchemaParser.asserts",
        ],
        notice: "These constructors validate the decoded/type side. They are not a substitute for decodeUnknown* at untrusted encoded boundaries, especially when a schema transforms its external representation.",
    },

    Decode: {
        eyebrow: "encoded input → decoded Type",
        title: "Pick the result style that matches the caller's error boundary",
        description:
            "The decode family shares one schema parser and exposes it through Effect, Promise, Exit, Result, and throwing synchronous adapters. Each style also has a typed Encoded-input form and an unknown-input form for boundary data.",
        code: `const schema =
    Schema.NumberFromString

SchemaParser
    .decodeUnknownEffect(schema)("42")
// Effect<number, Issue>

SchemaParser
    .decodeUnknownResult(schema)("x")
// Result<number, Issue>`,
        apis: [
            "decodeEffect",
            "decodeUnknownEffect",
            "decodePromise",
            "decodeUnknownPromise",
            "decodeExit",
            "decodeUnknownExit",
            "decodeResult",
            "decodeUnknownResult",
            "decodeSync",
            "decodeUnknownSync",
        ],
        notice: "Effect is the most general adapter because it preserves service requirements and asynchronous work. The synchronous adapters can only represent schema-only failures cleanly; defects, interruption, or async work cross that boundary differently.",
    },

    Encode: {
        eyebrow: "decoded Type → encoded representation",
        title: "Encoding is the same parser pipeline with the schema direction reversed",
        description:
            "The encode family mirrors decoding: Effect, Promise, Exit, Result, and sync forms, each in typed and unknown-input variants. For a transformed schema such as NumberFromString, encoding turns the decoded number back into the external string representation.",
        code: `const schema =
    Schema.NumberFromString

SchemaParser
    .encodeEffect(schema)(42)
// Effect<string, Issue>

SchemaParser
    .encodeUnknownSync(schema)(42)
// "42"`,
        apis: [
            "encodeEffect",
            "encodeUnknownEffect",
            "encodePromise",
            "encodeUnknownPromise",
            "encodeExit",
            "encodeUnknownExit",
            "encodeResult",
            "encodeUnknownResult",
            "encodeSync",
            "encodeUnknownSync",
        ],
        notice: "Use typed encode* when the caller already has the schema's Type. Use encodeUnknown* when runtime validation of the value is part of the boundary contract.",
    },

    Boundary: {
        eyebrow:
            "unknown vs typed input · parse options · schema-only failures",
        title: "Separate parser semantics from the adapter that transports the outcome",
        description:
            "Unknown-input functions validate the boundary type, while typed functions assume the input is already statically Encoded or Type. ParseOptions control issue collection, excess properties, input retention, checks, and async concurrency. Throwing and Promise adapters wrap schema failures in Error.cause rather than formatting them automatically.",
        code: `const decode =
    SchemaParser.decodeUnknownResult(
        Person,
        {
            errors: "all",
            onExcessProperty: "error",
            reportInput: true
        }
    )

const result = decode(input)
// Failure contains SchemaIssue.Issue`,
        apis: [
            "SchemaAST.ParseOptions",
            "SchemaIssue.Issue",
            "SchemaIssue.makeFormatterDefault",
        ],
        notice: "The public API page lists 25 operations. The source file also exports low-level compiler/runner helpers and Option adapters marked @internal; application code should not treat those internal exports as supported public surface.",
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

export const construct_snapshot = (model: Model): Snapshot => {
    switch (model.constructCase) {
        case "Sync":
            return {
                input: '{ name: "Ada", age: 36 }',
                operation: "make(Person)",
                result: "Person value or Error(cause = Issue)",
                invariant:
                    "constructor validation runs on the decoded Type side",
                implementation:
                    "schema-only failure becomes a thrown Error with a generic message",
                guidance:
                    "Format error.cause explicitly when developer-facing detail is needed.",
            }

        case "Effect":
            return {
                input: "constructor input",
                operation: "makeEffect(Person)",
                result: "Effect<Person, Issue>",
                invariant:
                    "failure remains typed data in the Effect error channel",
                implementation:
                    "constructor defaults and type-side checks still run",
                guidance:
                    "Prefer this when construction belongs inside a larger Effect program.",
            }

        case "Option":
            return {
                input: "constructor input",
                operation: "makeOption(Person)",
                result: "Some(Person) | None",
                invariant: "schema issue details are intentionally discarded",
                implementation: "only schema-only causes collapse to None",
                guidance:
                    "Use when success/failure is enough and diagnostics are deliberately unnecessary.",
            }

        case "Guards":
            return {
                input: "unknown candidate",
                operation: "is(Person) / asserts(Person, value)",
                result: "boolean narrowing / assertion narrowing",
                invariant: "validation targets the decoded Type side",
                implementation:
                    "schema-only failures become false or a thrown validation Error",
                guidance:
                    "Use decodeUnknown* instead when the input is the schema's encoded external representation.",
            }
    }
}

export const decode_snapshot = (model: Model): Snapshot => {
    switch (model.decodeCase) {
        case "Effect":
            return {
                input: 'unknown "42"',
                operation: "decodeUnknownEffect(NumberFromString)",
                result: "Effect succeeds with 42",
                invariant:
                    "services and async transformations remain representable",
                implementation:
                    "SchemaIssue.Issue stays in the typed error channel",
                guidance: "Use Effect for the most general decoding boundary.",
            }

        case "Promise":
            return {
                input: 'typed encoded string "42"',
                operation: "decodePromise(NumberFromString)",
                result: "Promise<number>",
                invariant: "service-free schemas only",
                implementation:
                    "schema failure rejects with Error whose cause is Issue",
                guidance:
                    "Inspect the cause; the wrapper message is intentionally generic.",
            }

        case "Exit":
            return {
                input: 'unknown "bad"',
                operation: "decodeUnknownExit",
                result: "Exit.Failure",
                invariant: "synchronous outcome is explicit data",
                implementation:
                    "async work can surface as a defect cause at this sync boundary",
                guidance:
                    "Use when you need full Exit/Cause information synchronously.",
            }

        case "Result":
            return {
                input: 'unknown "bad"',
                operation: "decodeUnknownResult",
                result: "Result.fail(Issue)",
                invariant: "schema-only failure becomes ordinary data",
                implementation:
                    "non-schema reasons still throw at the synchronous adapter",
                guidance:
                    "Good for form/API validation where callers want the Issue tree directly.",
            }

        case "Sync":
            return {
                input: 'typed encoded string "42"',
                operation: "decodeSync(NumberFromString)",
                result: "42 or throws",
                invariant: "caller accepts a throwing synchronous boundary",
                implementation: "schema failure is stored in Error.cause",
                guidance:
                    "Prefer Result or Exit when failure should remain explicit data.",
            }
    }
}

export const encode_snapshot = (model: Model): Snapshot => {
    switch (model.encodeCase) {
        case "Effect":
            return {
                input: "decoded number 42",
                operation: "encodeEffect(NumberFromString)",
                result: 'Effect succeeds with "42"',
                invariant: "encoding may itself require services",
                implementation:
                    "the schema transformation direction is reversed",
                guidance:
                    "Use Effect when encoding includes effectful transformations or services.",
            }

        case "Promise":
            return {
                input: "decoded number 42",
                operation: "encodePromise",
                result: 'Promise resolves "42"',
                invariant: "service-free schema requirement",
                implementation:
                    "schema failures reject with Error(cause = Issue)",
                guidance:
                    "Use at Promise-native integration boundaries, not to erase Effect requirements.",
            }

        case "Exit":
            return {
                input: "unknown value to validate then encode",
                operation: "encodeUnknownExit",
                result: "Exit<Encoded, Issue>",
                invariant:
                    "runtime input validation and encoding share one sync outcome",
                implementation:
                    "Cause is preserved for non-schema synchronous failures",
                guidance:
                    "Useful when callers already speak Exit and need no exceptions.",
            }

        case "Result":
            return {
                input: "decoded number 42",
                operation: "encodeResult",
                result: 'Result.succeed("42")',
                invariant: "schema-only failure is plain data",
                implementation:
                    "typed input avoids the extra unknown-side validation contract",
                guidance:
                    "Use when the decoded value is already statically Type and diagnostics should stay structured.",
            }

        case "Sync":
            return {
                input: "decoded number 42",
                operation: "encodeSync",
                result: '"42" or throws',
                invariant: "synchronous / service-free encoding",
                implementation: "schema failure throws Error with Issue cause",
                guidance:
                    "Use only where throwing is the desired API contract.",
            }
    }
}

export const boundary_snapshot = (model: Model): Snapshot => {
    switch (model.boundaryCase) {
        case "Unknown":
            return {
                input: "untrusted JSON / form / network value",
                operation: "decodeUnknown* / encodeUnknown*",
                result: "runtime boundary validation included",
                invariant:
                    "input has no trusted static relationship to the schema",
                implementation:
                    "unknown variants accept unknown and let the schema establish the value",
                guidance: "Default to unknown variants at external boundaries.",
            }

        case "Typed":
            return {
                input: "already typed Encoded or Type value",
                operation: "decode* / encode*",
                result: "narrower call signature",
                invariant: "static type relationship is already known",
                implementation:
                    "the runtime parser still validates schema semantics",
                guidance:
                    "Use typed variants inside trusted code after the boundary has already been established.",
            }

        case "Options":
            return {
                input: "nested object with several bad fields",
                operation: 'errors:"all" + onExcessProperty:"error"',
                result: "Composite Issue with multiple paths",
                invariant:
                    "ParseOptions change parsing/reporting policy, not the schema type",
                implementation:
                    "call-site options override options supplied when the parser was created",
                guidance:
                    "Enable reportInput only when retaining rejected values is acceptable.",
            }

        case "Failure":
            return {
                input: "schema issue vs defect / interruption / async work",
                operation: "adapter conversion",
                result: "Issue data only when the cause is schema-only",
                invariant:
                    "adapters do not mislabel arbitrary runtime failures as validation errors",
                implementation:
                    "sync/Option/Result/throwing adapters inspect the Cause before converting it",
                guidance:
                    "Use Effect when the parser may legitimately perform async or service-requiring work.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaParserStage: {
        stage: Stage,
    },
    SelectedSchemaParserConstructCase: {
        constructCase: ConstructCase,
    },
    SelectedSchemaParserDecodeCase: {
        decodeCase: DecodeCase,
    },
    SelectedSchemaParserEncodeCase: {
        encodeCase: EncodeCase,
    },
    SelectedSchemaParserBoundaryCase: {
        boundaryCase: BoundaryCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",
    constructCase: "Sync",
    decodeCase: "Effect",
    encodeCase: "Effect",
    boundaryCase: "Unknown",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type ConstructCasePayload = Readonly<{
    constructCase: ConstructCase
}>
type DecodeCasePayload = Readonly<{
    decodeCase: DecodeCase
}>
type EncodeCasePayload = Readonly<{
    encodeCase: EncodeCase
}>
type BoundaryCasePayload = Readonly<{
    boundaryCase: BoundaryCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaParserStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaParserConstructCase: ({
            constructCase,
        }: ConstructCasePayload) => ({
            model: modifyFields(model, {
                constructCase: () => constructCase,
            }),
        }),

        SelectedSchemaParserDecodeCase: ({
            decodeCase,
        }: DecodeCasePayload) => ({
            model: modifyFields(model, {
                decodeCase: () => decodeCase,
            }),
        }),

        SelectedSchemaParserEncodeCase: ({
            encodeCase,
        }: EncodeCasePayload) => ({
            model: modifyFields(model, {
                encodeCase: () => encodeCase,
            }),
        }),

        SelectedSchemaParserBoundaryCase: ({
            boundaryCase,
        }: BoundaryCasePayload) => ({
            model: modifyFields(model, {
                boundaryCase: () => boundaryCase,
            }),
        }),
    })
