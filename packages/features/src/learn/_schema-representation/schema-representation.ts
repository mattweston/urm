import { Schema as S, SchemaAST, SchemaRepresentation } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCHEMA REPRESENTATION EXAMPLES
// -----------------------------------------------------------------------------

export const Address = S.Struct({
    city: S.String,
})

export const Person = S.Struct({
    name: S.String,
    home: Address,
    work: Address,
})

export const NumberFromString = S.NumberFromString

export const person_document = SchemaRepresentation.toRepresentation(Person.ast)

export const number_encoded_document = SchemaRepresentation.toRepresentation(
    NumberFromString.ast
)

export const number_type_document = SchemaRepresentation.toRepresentation(
    SchemaAST.toType(NumberFromString.ast)
)

export const multi_document = SchemaRepresentation.toRepresentations([
    Person.ast,
    NumberFromString.ast,
] as const)

export const shared_reference_document = SchemaRepresentation.toRepresentation(
    Person.ast,
    {
        referencePolicy: (
            input: SchemaRepresentation.ReferencePolicyInput
        ): string | undefined =>
            input.occurrences > 1
                ? (input.identifier ?? "Shared")
                : input.identifier,
    }
)

export const shared_reference_names = Object.keys(
    shared_reference_document.references
)

export const persisted_person_document =
    SchemaRepresentation.toJson(person_document)

export const decoded_person_document = SchemaRepresentation.fromJson(
    persisted_person_document
)

export const restored_person_schema = SchemaRepresentation.fromRepresentation(
    decoded_person_document,
    {
        revivers: [],
    }
)

export const restored_person_value = S.decodeUnknownSync(
    /*
      Argument of type 'Top' is not assignable to parameter of type 'ConstraintDecoder<unknown, never>'.
        Types of property '"DecodingServices"' are incompatible.
          Type 'unknown' is not assignable to type 'never'.
      */
    restored_person_schema
)({
    name: "Ada",
    home: {
        city: "London",
    },
    work: {
        city: "Cardiff",
    },
})

export const json_schema_document =
    SchemaRepresentation.toJsonSchemaDocument(person_document)

export const imported_from_json_schema =
    SchemaRepresentation.fromJsonSchemaDocument(json_schema_document)

export const code_document = SchemaRepresentation.toCodeDocument(
    SchemaRepresentation.toMultiDocument(person_document)
)

export const code_summary = {
    roots: code_document.codes.length,
    nonRecursiveReferences: code_document.references.nonRecursives.length,
    recursiveReferences: Object.keys(code_document.references.recursives)
        .length,
    artifacts: code_document.artifacts.length,
} as const

export const manual_code = SchemaRepresentation.makeCode(
    "Schema.String",
    "string"
)

type DemoDeclarationReviveInput = Readonly<{
    payload: string
    typeParameters: ReadonlyArray<unknown>
    annotations: unknown | undefined
}>

type DemoFilterReviveInput = Readonly<{
    payload: string
    schemas: ReadonlyArray<unknown>
    annotations: unknown | undefined
}>

export const demo_declaration_reviver =
    SchemaRepresentation.makeDeclarationReviver(
        "urm/learn/SchemaRepresentation/Literal",
        S.String,
        (input: DemoDeclarationReviveInput): S.Top => S.Literal(input.payload)
    )

export const demo_filter_reviver = SchemaRepresentation.makeFilterReviver(
    "urm/learn/SchemaRepresentation/Pattern",
    S.String,
    (input: DemoFilterReviveInput) =>
        SchemaAST.isPattern(new globalThis.RegExp(input.payload))
)

export const encoded_root_tag = number_encoded_document.representation._tag

export const type_root_tag = number_type_document.representation._tag

export const person_json_text = JSON.stringify(
    persisted_person_document,
    null,
    2
)

export const json_schema_text = JSON.stringify(json_schema_document, null, 2)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Represent"),
    S.Literal("Persist"),
    S.Literal("Revive"),
    S.Literal("Compile"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Represent",
    "Persist",
    "Revive",
    "Compile",
]

export const RepresentCase = S.Union([
    S.Literal("Encoded"),
    S.Literal("Type"),
    S.Literal("Multi"),
    S.Literal("References"),
])
export type RepresentCase = typeof RepresentCase.Type

export const represent_cases: ReadonlyArray<RepresentCase> = [
    "Encoded",
    "Type",
    "Multi",
    "References",
]

export const PersistCase = S.Union([
    S.Literal("Json"),
    S.Literal("RoundTrip"),
    S.Literal("Annotations"),
    S.Literal("Symbols"),
])
export type PersistCase = typeof PersistCase.Type

export const persist_cases: ReadonlyArray<PersistCase> = [
    "Json",
    "RoundTrip",
    "Annotations",
    "Symbols",
]

export const ReviveCase = S.Union([
    S.Literal("Plain"),
    S.Literal("Custom"),
    S.Literal("IDs"),
    S.Literal("Missing"),
])
export type ReviveCase = typeof ReviveCase.Type

export const revive_cases: ReadonlyArray<ReviveCase> = [
    "Plain",
    "Custom",
    "IDs",
    "Missing",
]

export const CompileCase = S.Union([
    S.Literal("JsonSchema"),
    S.Literal("Code"),
    S.Literal("Import"),
    S.Literal("Limits"),
])
export type CompileCase = typeof CompileCase.Type

export const compile_cases: ReadonlyArray<CompileCase> = [
    "JsonSchema",
    "Code",
    "Import",
    "Limits",
]

export const Model = S.Struct({
    stage: Stage,
    representCase: RepresentCase,
    persistCase: PersistCase,
    reviveCase: ReviveCase,
    compileCase: CompileCase,
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
    Represent: {
        eyebrow: "SchemaAST → open structural document",
        title: "Lower an AST into a transportable representation without losing its shape",
        description:
            "toRepresentation lowers one AST root into a live Document. It uses the encoded side by default; call SchemaAST.toType first when you want the decoded/type-side shape. toRepresentations does the same for multiple roots in one shared reference environment.",
        code: `const encoded =
    SchemaRepresentation
        .toRepresentation(
            Schema.NumberFromString.ast
        )

const type =
    SchemaRepresentation
        .toRepresentation(
            SchemaAST.toType(
                Schema.NumberFromString.ast
            )
        )

encoded.representation._tag
// "String"

type.representation._tag
// "Number"`,
        apis: [
            "toRepresentation",
            "toRepresentations",
            "ReferencePolicy",
            "Document",
            "MultiDocument",
        ],
        notice: "The default lowering direction is the encoded side. That matters for transformed schemas: a NumberFromString document describes the wire string unless you explicitly lower SchemaAST.toType(ast).",
    },

    Persist: {
        eyebrow: "live document ↔ stable JSON projection",
        title: "Persist the structural document, not runtime callbacks",
        description:
            "toJson converts a live Document into Schema.Json suitable for storage or transport. fromJson validates and restores that persisted structural document. Generic annotations that are not JSON are omitted, and runtime callbacks are not reconstructed by JSON decoding.",
        code: `const live =
    SchemaRepresentation
        .toRepresentation(
            Person.ast
        )

const json =
    SchemaRepresentation
        .toJson(live)

const restored =
    SchemaRepresentation
        .fromJson(json)`,
        apis: [
            "toJson",
            "toJsonMultiDocument",
            "fromJson",
            "fromJsonMultiDocument",
            "RepresentationAnnotation",
        ],
        notice: "Persistence is intentionally structural. Non-JSON annotations are pruned, local symbols cannot be reconstructed by identity, and decoding a persisted document does not magically reinstall declaration/check behavior.",
    },

    Revive: {
        eyebrow: "representation document → runtime Schema",
        title: "Reinstall opaque declarations and checks through an explicit local reviver registry",
        description:
            "fromRepresentation reconstructs a runtime schema from the structural document. Plain built-in structures need no custom revivers. Opaque declarations and checks carry representation IDs; callers supply matching revivers explicitly, and none are installed implicitly.",
        code: `const restored =
    SchemaRepresentation
        .fromRepresentation(
            document,
            {
                revivers: []
            }
        )

const custom =
    SchemaRepresentation
        .makeDeclarationReviver(
            "demo/id",
            Schema.String,
            ({ payload }) =>
                Schema.Literal(payload)
        )`,
        apis: [
            "fromRepresentation",
            "fromRepresentations",
            "DeclarationReviver",
            "FilterReviver",
            "FilterGroupReviver",
        ],
        notice: "URM's rc.112 API names the helpers makeDeclarationReviver / makeFilterReviver / makeFilterGroupReviver. The live rc.116 docs rename them makeReviverDeclaration / makeReviverFilter / makeReviverFilterGroup and add many built-in revivers.",
    },

    Compile: {
        eyebrow: "one representation, multiple downstream targets",
        title: "Compile to JSON Schema or source code, and import the supported JSON Schema subset back",
        description:
            "toJsonSchemaDocument emits Draft 2020-12 JSON Schema from a live representation. toCodeDocument emits runtime and TypeScript source for MultiDocument input. fromJsonSchemaDocument imports a supported Draft 2020-12 subset back into Effect Schema.",
        code: `const document =
    SchemaRepresentation
        .toRepresentation(
            Person.ast
        )

const jsonSchema =
    SchemaRepresentation
        .toJsonSchemaDocument(
            document
        )

const code =
    SchemaRepresentation
        .toCodeDocument(
            SchemaRepresentation
                .toMultiDocument(
                    document
                )
        )`,
        apis: [
            "toJsonSchemaDocument",
            "toJsonSchemaMultiDocument",
            "toCodeDocument",
            "makeCode",
            "fromJsonSchemaDocument",
            "fromJsonSchemaMultiDocument",
        ],
        notice: "These compilers are not promises of lossless semantic identity for every Schema feature. Opaque declarations/checks need compiler annotations, and JSON Schema has different defaults or expressiveness for some constraints.",
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

export const represent_snapshot = (model: Model): Snapshot => {
    switch (model.representCase) {
        case "Encoded":
            return {
                input: "Schema.NumberFromString.ast",
                operation: "toRepresentation(ast)",
                result: 'root _tag = "String"',
                invariant:
                    "representation lowering starts from the encoded side",
                implementation:
                    "encoding links are followed toward the wire-format AST",
                guidance:
                    "Use this when persistence / wire shape is the representation you need.",
            }

        case "Type":
            return {
                input: "SchemaAST.toType(NumberFromString.ast)",
                operation: "toRepresentation(typeAst)",
                result: 'root _tag = "Number"',
                invariant: "toType strips encoding transformations first",
                implementation:
                    "the representation now describes the decoded Type side",
                guidance:
                    "Call toType explicitly when tooling should reason about application values rather than wire values.",
            }

        case "Multi":
            return {
                input: "[Person.ast, NumberFromString.ast]",
                operation: "toRepresentations(roots)",
                result: "MultiDocument with two ordered roots",
                invariant: "roots share one reference environment",
                implementation:
                    "reference occurrence counts are observed across every root before emission",
                guidance:
                    "Use one MultiDocument when several schemas must share references or generated definitions.",
            }

        case "References":
            return {
                input: "Person uses the same Address schema twice",
                operation: "referencePolicy({ occurrences })",
                result: "repeated candidate extracted into references",
                invariant: "recursive candidates always require a reference",
                implementation:
                    "policy returns a requested name or undefined to keep a candidate inline",
                guidance:
                    "Keep custom reference policies deterministic and treat the AST input as immutable.",
            }
    }
}

export const persist_snapshot = (model: Model): Snapshot => {
    switch (model.persistCase) {
        case "Json":
            return {
                input: "live Document",
                operation: "toJson(document)",
                result: "Schema.Json suitable for storage / transport",
                invariant:
                    "the JSON projection contains structural representation data",
                implementation:
                    "native literal/property-key values receive persistent discriminators where needed",
                guidance:
                    "Persist the JSON projection rather than serializing the live document ad hoc.",
            }

        case "RoundTrip":
            return {
                input: "toJson(personDocument)",
                operation: "fromJson(json)",
                result: "validated live Document",
                invariant:
                    "JSON decode restores structure, not executable callbacks",
                implementation:
                    "fromJson uses the module's representation codec",
                guidance:
                    "Call fromRepresentation separately when you actually need a runtime Schema again.",
            }

        case "Annotations":
            return {
                input: "annotations with JSON and non-JSON values",
                operation: "toJson(document)",
                result: "generic non-JSON annotations omitted",
                invariant:
                    "persistence identity uses explicit RepresentationAnnotation payloads",
                implementation:
                    "generic annotations are pruned to JSON-compatible values",
                guidance:
                    "Do not hide required reconstruction metadata in arbitrary non-JSON annotations.",
            }

        case "Symbols":
            return {
                input: "local symbol property key",
                operation: "live representation → persistent JSON",
                result: "unsupported identity cannot be reconstructed",
                invariant:
                    "global / persistable identity must survive a process boundary",
                implementation:
                    "local symbols can exist live but persistent codecs reject unreconstructable identity",
                guidance:
                    "Use stable string/global-symbol identities for anything intended to persist.",
            }
    }
}

export const revive_snapshot = (model: Model): Snapshot => {
    switch (model.reviveCase) {
        case "Plain":
            return {
                input: "persisted Person struct document",
                operation: "fromRepresentation({ revivers: [] })",
                result: "runtime Schema.Top",
                invariant:
                    "built-in structural nodes need no application reviver",
                implementation:
                    "the schema AST is reconstructed from the representation tree",
                guidance:
                    "Keep the reviver list empty for plain structures unless opaque annotations actually require one.",
            }

        case "Custom":
            return {
                input: "opaque declaration/check with representation id",
                operation:
                    "provide matching DeclarationReviver / FilterReviver",
                result: "runtime callback behavior restored",
                invariant:
                    "payload is validated by the reviver's payloadSchema",
                implementation:
                    "revive receives payload, dependencies, and annotations",
                guidance:
                    "Make reviver IDs stable persistence identifiers, not implementation-detail names.",
            }

        case "IDs":
            return {
                input: "reviver collection",
                operation: "resolve locally by id",
                result: "matching callback used for one persisted opaque node",
                invariant:
                    "no reviver registry is installed globally or implicitly",
                implementation:
                    "the caller supplies the complete allowed registry for this reconstruction",
                guidance:
                    "Treat the supplied reviver set as part of the trust boundary for persisted schema behavior.",
            }

        case "Missing":
            return {
                input: "document references an opaque id not in revivers",
                operation: "fromRepresentation",
                result: "reconstruction fails",
                invariant: "unknown executable behavior is never guessed",
                implementation:
                    "structural persistence cannot invent the missing callback",
                guidance:
                    "Version and migrate persisted representation IDs deliberately when application behavior changes.",
            }
    }
}

export const compile_snapshot = (model: Model): Snapshot => {
    switch (model.compileCase) {
        case "JsonSchema":
            return {
                input: "live representation Document",
                operation: "toJsonSchemaDocument",
                result: "Draft 2020-12 document",
                invariant:
                    "references are already allocated by toRepresentation",
                implementation:
                    "check compiler annotations contribute JSON Schema fragments",
                guidance:
                    "Align Effect parse options such as excess-property behavior when comparing validation semantics.",
            }

        case "Code":
            return {
                input: "MultiDocument",
                operation: "toCodeDocument",
                result: "runtime + TypeScript code roots, references, artifacts",
                invariant:
                    "single-root Document is wrapped with toMultiDocument first",
                implementation:
                    "opaque declarations/checks require code-generation callbacks",
                guidance:
                    "Inspect artifacts and reference code instead of assuming one flat generated string.",
            }

        case "Import":
            return {
                input: "Draft 2020-12 JSON Schema",
                operation: "fromJsonSchemaDocument",
                result: "runtime Schema.Top for the supported subset",
                invariant:
                    "import is best-effort rather than a universal JSON Schema interpreter",
                implementation: 'pattern handling defaults to "error"',
                guidance:
                    'Use patterns:"apply" only for trusted documents; ignore weakens validation.',
            }

        case "Limits":
            return {
                input: "features with semantics JSON Schema cannot reproduce exactly",
                operation: "compile / import",
                result: "documented approximation or explicit unsupported error",
                invariant:
                    "representation is extensible, but each target compiler has its own expressiveness",
                implementation:
                    "custom callback results are trusted directly and exceptions propagate",
                guidance:
                    "Treat compiler annotations as executable extension points with their own correctness and trust requirements.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaRepresentationStage: {
        stage: Stage,
    },
    SelectedSchemaRepresentationRepresentCase: {
        representCase: RepresentCase,
    },
    SelectedSchemaRepresentationPersistCase: {
        persistCase: PersistCase,
    },
    SelectedSchemaRepresentationReviveCase: {
        reviveCase: ReviveCase,
    },
    SelectedSchemaRepresentationCompileCase: {
        compileCase: CompileCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Represent",
    representCase: "Encoded",
    persistCase: "Json",
    reviveCase: "Plain",
    compileCase: "JsonSchema",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type RepresentCasePayload = Readonly<{
    representCase: RepresentCase
}>
type PersistCasePayload = Readonly<{
    persistCase: PersistCase
}>
type ReviveCasePayload = Readonly<{
    reviveCase: ReviveCase
}>
type CompileCasePayload = Readonly<{
    compileCase: CompileCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaRepresentationStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaRepresentationRepresentCase: ({
            representCase,
        }: RepresentCasePayload) => ({
            model: evo(model, {
                representCase: () => representCase,
            }),
        }),

        SelectedSchemaRepresentationPersistCase: ({
            persistCase,
        }: PersistCasePayload) => ({
            model: evo(model, {
                persistCase: () => persistCase,
            }),
        }),

        SelectedSchemaRepresentationReviveCase: ({
            reviveCase,
        }: ReviveCasePayload) => ({
            model: evo(model, {
                reviveCase: () => reviveCase,
            }),
        }),

        SelectedSchemaRepresentationCompileCase: ({
            compileCase,
        }: CompileCasePayload) => ({
            model: evo(model, {
                compileCase: () => compileCase,
            }),
        }),
    })
