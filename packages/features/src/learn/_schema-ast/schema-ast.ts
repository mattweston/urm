import { Schema as S, SchemaAST } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCHEMA AST EXAMPLES
// -----------------------------------------------------------------------------

export const sample_struct_ast = S.Struct({
    name: S.String,
    age: S.Number,
}).ast

export const inspect_struct_example = (): ReadonlyArray<
    readonly [PropertyKey, string]
> => {
    if (!SchemaAST.isObjects(sample_struct_ast)) {
        return []
    }

    return sample_struct_ast.propertySignatures.map(
        (property: SchemaAST.PropertySignature) =>
            [property.name, property.type._tag] as const
    )
}

export const guard_example = (
    input: unknown
): Readonly<{
    isAST: boolean
    tag: string
}> => {
    if (!SchemaAST.isAST(input)) {
        return {
            isAST: false,
            tag: "not an AST",
        }
    }

    const ast = input as Readonly<{
        _tag: string
    }>

    return {
        isAST: true,
        tag: ast._tag,
    }
}

export const annotated_string_ast = new SchemaAST.String({
    title: "Display name",
    description: "Human-readable account name",
    identifier: "DisplayName",
})

export const annotation_example = (): Readonly<{
    title: string
    description: string
    identifier: string
}> => ({
    title: SchemaAST.resolveTitle(annotated_string_ast) ?? "none",
    description: SchemaAST.resolveDescription(annotated_string_ast) ?? "none",
    identifier: SchemaAST.resolveIdentifier(annotated_string_ast) ?? "none",
})

export const optional_string_ast = new SchemaAST.String(
    undefined,
    undefined,
    undefined,
    new SchemaAST.Context(true, false)
)

export const optional_context_example = (): Readonly<{
    optional: boolean
    mutable: boolean
}> => ({
    optional: SchemaAST.isOptional(optional_string_ast),
    mutable: optional_string_ast.context?.isMutable ?? false,
})

export const constructed_user_ast = new SchemaAST.Objects(
    [
        new SchemaAST.PropertySignature(
            "name",
            new SchemaAST.String({
                title: "Name",
            })
        ),
        new SchemaAST.PropertySignature("age", SchemaAST.number),
    ],
    []
)

export const constructed_object_example = (): Readonly<{
    tag: string
    fields: ReadonlyArray<string>
    fieldTags: ReadonlyArray<string>
}> => ({
    tag: constructed_user_ast._tag,
    fields: constructed_user_ast.propertySignatures.map(
        (property: SchemaAST.PropertySignature) =>
            globalThis.String(property.name)
    ),
    fieldTags: constructed_user_ast.propertySignatures.map(
        (property: SchemaAST.PropertySignature) => property.type._tag
    ),
})

export const literal_example = (): Readonly<{
    tag: string
    literal: SchemaAST.LiteralValue
}> => {
    const ast = new SchemaAST.Literal("active")

    return {
        tag: ast._tag,
        literal: ast.literal,
    }
}

export const suspend_example = (): Readonly<{
    tag: string
    target: string
    memoized: boolean
}> => {
    const ast = new SchemaAST.Suspend(() => constructed_user_ast)

    const first = ast.thunk()
    const second = ast.thunk()

    return {
        tag: ast._tag,
        target: first._tag,
        memoized: first === second,
    }
}

export const union_inspection_example = (): Readonly<{
    tag: string
    members: ReadonlyArray<string>
}> => {
    const ast = S.Union([S.String, S.Number]).ast

    if (!SchemaAST.isUnion(ast)) {
        return {
            tag: ast._tag,
            members: [],
        }
    }

    return {
        tag: ast._tag,
        members: ast.types.map((member: SchemaAST.AST) => member._tag),
    }
}

export const number_from_string_ast = S.NumberFromString.ast

export const transform_example = (): Readonly<{
    source: string
    type: string
    encoded: string
    flipped: string
    typeMemoized: boolean
    encodedMemoized: boolean
}> => {
    const typeFirst = SchemaAST.toType(number_from_string_ast)
    const typeSecond = SchemaAST.toType(number_from_string_ast)
    const encodedFirst = SchemaAST.toEncoded(number_from_string_ast)
    const encodedSecond = SchemaAST.toEncoded(number_from_string_ast)

    return {
        source: number_from_string_ast._tag,
        type: typeFirst._tag,
        encoded: encodedFirst._tag,
        flipped: SchemaAST.flip(number_from_string_ast)._tag,
        typeMemoized: typeFirst === typeSecond,
        encodedMemoized: encodedFirst === encodedSecond,
    }
}

export const email_filter = SchemaAST.isPattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)

export const pattern_example = (
    input: string
): Readonly<{
    input: string
    result: string
}> => {
    const issue = email_filter.run(input, SchemaAST.string, {})

    return {
        input,
        result: issue === undefined ? "valid" : issue._tag,
    }
}

export const grouped_filter_example = (): Readonly<{
    tag: string
    checks: number
    firstTag: string
    secondTag: string
}> => {
    const letters = SchemaAST.isPattern(/^[a-z]+$/)
    const minimumThree = SchemaAST.isPattern(/^.{3,}$/)
    const group = letters.and(minimumThree)

    return {
        tag: group._tag,
        checks: group.checks.length,
        firstTag: group.checks[0]._tag,
        secondTag: group.checks[1]._tag,
    }
}

export const parse_options_example: SchemaAST.ParseOptions = {
    errors: "all",
    onExcessProperty: "error",
    concurrency: 2,
    reportInput: false,
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Inspect"),
    S.Literal("Construct"),
    S.Literal("Transform"),
    S.Literal("Parse"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Inspect",
    "Construct",
    "Transform",
    "Parse",
]

export const InspectCase = S.Union([
    S.Literal("Node"),
    S.Literal("Guards"),
    S.Literal("Annotations"),
    S.Literal("Context"),
])
export type InspectCase = typeof InspectCase.Type

export const inspect_cases: ReadonlyArray<InspectCase> = [
    "Node",
    "Guards",
    "Annotations",
    "Context",
]

export const ConstructCase = S.Union([
    S.Literal("Singletons"),
    S.Literal("Literal"),
    S.Literal("Object"),
    S.Literal("Suspend"),
])
export type ConstructCase = typeof ConstructCase.Type

export const construct_cases: ReadonlyArray<ConstructCase> = [
    "Singletons",
    "Literal",
    "Object",
    "Suspend",
]

export const TransformCase = S.Union([
    S.Literal("TypeView"),
    S.Literal("EncodedView"),
    S.Literal("Flip"),
    S.Literal("Memo"),
])
export type TransformCase = typeof TransformCase.Type

export const transform_cases: ReadonlyArray<TransformCase> = [
    "TypeView",
    "EncodedView",
    "Flip",
    "Memo",
]

export const ParseCase = S.Union([
    S.Literal("Pattern"),
    S.Literal("Group"),
    S.Literal("Options"),
    S.Literal("Boundary"),
])
export type ParseCase = typeof ParseCase.Type

export const parse_cases: ReadonlyArray<ParseCase> = [
    "Pattern",
    "Group",
    "Options",
    "Boundary",
]

export const Model = S.Struct({
    stage: Stage,
    inspectCase: InspectCase,
    constructCase: ConstructCase,
    transformCase: TransformCase,
    parseCase: ParseCase,
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
    Inspect: {
        eyebrow: "every Schema exposes a discriminated runtime tree",
        title: "Inspect nodes with guards before reading variant fields",
        description:
            "SchemaAST.AST is a discriminated union. Every node has a _tag plus shared annotations, checks, encoding, and context. Use isAST at unknown boundaries and variant guards such as isObjects or isUnion before reading node-specific fields.",
        code: `const ast =
    S.Struct({
        name: S.String,
        age: S.Number
    }).ast

if (
    SchemaAST.isObjects(ast)
) {
    ast.propertySignatures
        .map(property => [
            property.name,
            property.type._tag
        ])
}`,
        apis: [
            "SchemaAST.AST",
            "SchemaAST.isAST",
            "SchemaAST.isObjects",
            "SchemaAST.resolveTitle",
        ],
        notice: "Most application code should stay in the higher-level Schema module. Drop to SchemaAST when the tree itself is the data you need to inspect or transform.",
    },

    Construct: {
        eyebrow:
            "primitive singletons and node constructors build trees directly",
        title: "Construct only the AST nodes you actually need",
        description:
            "SchemaAST exposes canonical primitive singletons plus constructors for literals, arrays, objects, unions, suspensions, declarations, checks, encoding links, and property metadata. Direct construction is useful for tooling and schema generators, but it is a lower-level API than Schema combinators.",
        code: `const ast =
    new SchemaAST.Objects(
        [
            new SchemaAST
                .PropertySignature(
                    "name",
                    SchemaAST.string
                ),
            new SchemaAST
                .PropertySignature(
                    "age",
                    SchemaAST.number
                )
        ],
        []
    )`,
        apis: [
            "SchemaAST.string",
            "SchemaAST.Literal",
            "SchemaAST.PropertySignature",
            "SchemaAST.Objects",
            "SchemaAST.Suspend",
        ],
        notice: "Prefer the canonical singleton nodes such as string, number, boolean, unknown, and never when no per-node metadata is required.",
    },

    Transform: {
        eyebrow:
            "encoded and decoded schema views are explicit AST transformations",
        title: "Project type and wire representations without parsing values",
        description:
            "toType removes encoding transformations and returns the decoded type view. toEncoded flips the encoding direction and strips transformations to reveal the wire-format tree. flip reverses the encoding chain itself. These helpers recursively walk composite nodes and are memoized.",
        code: `const ast =
    S.NumberFromString.ast

SchemaAST.toType(ast)._tag
// "Number"

SchemaAST.toEncoded(ast)._tag
// "String"

SchemaAST.flip(ast)
// reverse encode / decode`,
        apis: [
            "SchemaAST.toType",
            "SchemaAST.toEncoded",
            "SchemaAST.flip",
            "SchemaAST.decodeTo",
            "SchemaAST.Encoding",
            "SchemaAST.Link",
        ],
        notice: "toType and toEncoded describe shapes; they do not decode or encode a runtime value. Use the Schema parsing APIs when you actually need to transform data.",
    },

    Parse: {
        eyebrow:
            "checks and parse options expose low-level validation mechanics",
        title: "Understand checks without bypassing the normal Schema parser",
        description:
            "Filter and FilterGroup represent post-type validation checks. isPattern builds a deterministic RegExp-backed Filter whose run method returns undefined on success or a SchemaIssue on failure. ParseOptions control error accumulation, excess-property handling, checks, concurrency, and input reporting.",
        code: `const email =
    SchemaAST.isPattern(
        /^[^@]+@[^@]+$/
    )

email.run(
    "alice@example.com",
    SchemaAST.string,
    {}
)
// undefined`,
        apis: [
            "SchemaAST.Filter",
            "SchemaAST.FilterGroup",
            "SchemaAST.isPattern",
            "SchemaAST.ParseOptions",
            "SchemaAST.Check",
            "SchemaAST.Checks",
        ],
        notice: "Calling Filter.run is useful for understanding a check, but full schema parsing also handles node matching, defaults, transformations, nested issues, and async parser coordination. Use Schema.decodeUnknown / encode for ordinary parsing.",
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

export const inspect_snapshot = (model: Model): Snapshot => {
    switch (model.inspectCase) {
        case "Node":
            return {
                input: "Schema.Struct(...).ast",
                operation: "read _tag after narrowing",
                result: 'Objects · fields "name", "age"',
                invariant: "AST is a discriminated union",
                implementation:
                    "all nodes share annotations / checks / encoding / context",
                guidance:
                    "Narrow first, then use variant-specific fields such as propertySignatures.",
            }

        case "Guards":
            return {
                input: "unknown runtime value",
                operation: "isAST → isObjects / isUnion / ...",
                result: "type-safe AST variant",
                invariant: "isAST checks the internal AST brand",
                implementation: "variant guards discriminate by _tag",
                guidance:
                    "Use isAST only at unknown boundaries; once you already have AST, use the specific guard you need.",
            }

        case "Annotations":
            return {
                input: "String AST with title / description / identifier",
                operation:
                    "resolveTitle + resolveDescription + resolveIdentifier",
                result: "annotation metadata",
                invariant: "checks can own the effective annotations",
                implementation:
                    "resolve reads the last check annotations when checks exist",
                guidance:
                    "Use resolve helpers rather than assuming Base.annotations is always the effective user annotation set.",
            }

        case "Context":
            return {
                input: "AST context { isOptional: true }",
                operation: "SchemaAST.isOptional(ast)",
                result: "true",
                invariant:
                    "property optionality lives on the child AST context",
                implementation:
                    "Context also tracks mutability, constructor default, and key annotations",
                guidance:
                    "PropertySignature itself only pairs a key with an AST; optional / mutable metadata belongs to the AST context.",
            }
    }
}

export const construct_snapshot = (model: Model): Snapshot => {
    switch (model.constructCase) {
        case "Singletons":
            return {
                input: "SchemaAST.string / number / boolean / unknown / never",
                operation: "reuse canonical primitive nodes",
                result: "shared AST instances",
                invariant: "no metadata means no new node is required",
                implementation:
                    "constructors such as String(...) are available when metadata differs",
                guidance:
                    "Prefer singleton nodes for plain primitives and constructors when you need annotations, checks, encoding, or context.",
            }

        case "Literal":
            return {
                input: 'new SchemaAST.Literal("active")',
                operation: "store exact primitive literal",
                result: 'Literal("active")',
                invariant:
                    "numeric literal constructors require finite numbers",
                implementation:
                    "literal parser matches the stored value exactly",
                guidance:
                    "Use Literal for exact primitive values, not as a replacement for String / Number keyword nodes.",
            }

        case "Object":
            return {
                input: "PropertySignature[] + IndexSignature[]",
                operation: "new SchemaAST.Objects(...)",
                result: "Objects { name: String, age: Number }",
                invariant: "duplicate property names throw at construction",
                implementation:
                    "property optionality comes from the property type AST context",
                guidance:
                    "Direct Objects construction is useful in generators; Schema.Struct is clearer for ordinary application schemas.",
            }

        case "Suspend":
            return {
                input: "() => AST",
                operation: "new SchemaAST.Suspend(thunk)",
                result: "lazy recursive edge",
                invariant: "the thunk is memoized on first evaluation",
                implementation:
                    "recursive schemas avoid eager infinite construction",
                guidance:
                    "Use Suspend when a schema graph is recursive or mutually recursive.",
            }
    }
}

export const transform_snapshot = (model: Model): Snapshot => {
    switch (model.transformCase) {
        case "TypeView":
            return {
                input: "Schema.NumberFromString.ast",
                operation: "SchemaAST.toType",
                result: "Number",
                invariant: "encoding links are removed",
                implementation:
                    "composite children are transformed recursively",
                guidance:
                    "Use the type view when tooling needs the decoded / domain shape.",
            }

        case "EncodedView":
            return {
                input: "Schema.NumberFromString.ast",
                operation: "SchemaAST.toEncoded",
                result: "String",
                invariant: "wire shape is derived from the encoding chain",
                implementation: "toEncoded is equivalent to toType(flip(ast))",
                guidance:
                    "Use the encoded view when tooling needs the serialized input/output shape.",
            }

        case "Flip":
            return {
                input: "AST with Encoding links",
                operation: "SchemaAST.flip",
                result: "decode and encode directions swapped",
                invariant: "flipping changes the transformation direction",
                implementation:
                    "encoding links are reversed and each transformation is flipped",
                guidance:
                    "flip is the low-level mechanism behind encoding, not a value-level encode operation by itself.",
            }

        case "Memo":
            return {
                input: "same AST reference twice",
                operation: "toType / toEncoded",
                result: "same transformed reference",
                invariant: "view transforms are memoized and idempotent",
                implementation:
                    "same input reference can reuse transformed output",
                guidance:
                    "Tooling can repeatedly ask for encoded/type views without rebuilding identical trees.",
            }
    }
}

export const parse_snapshot = (model: Model): Snapshot => {
    switch (model.parseCase) {
        case "Pattern":
            return {
                input: "isPattern(/^[^@]+@[^@]+$/)",
                operation: 'filter.run("alice@example.com", string, {})',
                result: "undefined = check passed",
                invariant: "failure returns a SchemaIssue rather than false",
                implementation:
                    "the RegExp is cloned and lastIndex reset before every test",
                guidance:
                    "isPattern is deterministic even when the source RegExp uses global or sticky flags.",
            }

        case "Group":
            return {
                input: "filterA.and(filterB)",
                operation: "compose checks",
                result: "FilterGroup",
                invariant: "groups preserve each inner Check",
                implementation:
                    "aborted filters can stop further issue collection",
                guidance:
                    "Use groups to model refinements as composable checks instead of embedding unrelated logic in one filter.",
            }

        case "Options":
            return {
                input: '{ errors: "all", onExcessProperty: "error", concurrency: 2 }',
                operation: "pass ParseOptions through parsing",
                result: "different issue collection / product parsing policy",
                invariant: "parse options apply across the parse",
                implementation:
                    "reportInput can retain rejected values by reference",
                guidance:
                    "Leave reportInput off for sensitive data unless retaining rejected input is an intentional diagnostic choice.",
            }

        case "Boundary":
            return {
                input: "full runtime value",
                operation: "Schema.decodeUnknown / Schema.encode",
                result: "normal typed parse result",
                invariant:
                    "SchemaAST is parser machinery, not the everyday entry point",
                implementation:
                    "Schema-level APIs coordinate AST parsing, checks, transformations, and issues",
                guidance:
                    "Use Filter.run directly for tooling/tests; use Schema parsing APIs for real application decoding and encoding.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaASTStage: {
        stage: Stage,
    },
    SelectedSchemaASTInspectCase: {
        inspectCase: InspectCase,
    },
    SelectedSchemaASTConstructCase: {
        constructCase: ConstructCase,
    },
    SelectedSchemaASTTransformCase: {
        transformCase: TransformCase,
    },
    SelectedSchemaASTParseCase: {
        parseCase: ParseCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Inspect",
    inspectCase: "Node",
    constructCase: "Object",
    transformCase: "TypeView",
    parseCase: "Pattern",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type InspectCasePayload = Readonly<{
    inspectCase: InspectCase
}>
type ConstructCasePayload = Readonly<{
    constructCase: ConstructCase
}>
type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>
type ParseCasePayload = Readonly<{
    parseCase: ParseCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaASTStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaASTInspectCase: ({
            inspectCase,
        }: InspectCasePayload) => ({
            model: evo(model, {
                inspectCase: () => inspectCase,
            }),
        }),

        SelectedSchemaASTConstructCase: ({
            constructCase,
        }: ConstructCasePayload) => ({
            model: evo(model, {
                constructCase: () => constructCase,
            }),
        }),

        SelectedSchemaASTTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, {
                transformCase: () => transformCase,
            }),
        }),

        SelectedSchemaASTParseCase: ({ parseCase }: ParseCasePayload) => ({
            model: evo(model, {
                parseCase: () => parseCase,
            }),
        }),
    })
