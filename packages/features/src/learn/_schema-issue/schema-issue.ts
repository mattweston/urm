import { Schema as S, SchemaAST, SchemaIssue } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCHEMA ISSUE EXAMPLES
// -----------------------------------------------------------------------------

export const format_issue = SchemaIssue.makeFormatterDefault()

export const format_standard = SchemaIssue.makeFormatterStandardSchemaV1()

export const invalid_type_issue = new SchemaIssue.InvalidType(
    S.String.ast,
    42,
    {
        reportInput: true,
    }
)

export const invalid_value_issue = new SchemaIssue.InvalidValue(
    {
        expected: "a non-empty string",
    },
    "",
    {
        reportInput: true,
    }
)

export const missing_key_issue = new SchemaIssue.MissingKey(undefined)

export const unexpected_key_issue = new SchemaIssue.UnexpectedKey(
    S.Struct({
        name: S.String,
    }).ast,
    "extra",
    {
        reportInput: true,
    }
)

export const forbidden_issue = new SchemaIssue.Forbidden({
    message: "async operation is unavailable in this sync boundary",
})

export const nested_name_issue = new SchemaIssue.Pointer(
    ["user", "name"],
    invalid_type_issue
)

export const nested_age_issue = new SchemaIssue.Pointer(
    ["user", "age"],
    missing_key_issue
)

export const user_ast = S.Struct({
    name: S.String,
    age: S.Number,
}).ast

export const composite_issue = new SchemaIssue.Composite(user_ast, [
    nested_name_issue,
    nested_age_issue,
])

const get_union_ast = (): SchemaAST.Union => {
    const ast = S.Union([S.String, S.Number]).ast

    if (!SchemaAST.isUnion(ast)) {
        throw new Error("Expected a Union AST")
    }

    return ast
}

export const union_ast = get_union_ast()

export const any_of_issue = new SchemaIssue.AnyOf(
    union_ast,
    [
        new SchemaIssue.InvalidType(S.String.ast),
        new SchemaIssue.InvalidType(S.Number.ast),
    ],
    true,
    {
        reportInput: true,
    }
)

export const one_of_issue = new SchemaIssue.OneOf(
    union_ast,
    [S.String.ast, S.Literal("x").ast],
    "x",
    {
        reportInput: true,
    }
)

export const pattern_filter = SchemaAST.isPattern(/^valid$/, {
    expected: "the literal text valid",
})

export const filter_issue = new SchemaIssue.Filter(
    pattern_filter,
    new SchemaIssue.InvalidValue(
        {
            expected: "the literal text valid",
        },
        "invalid",
        {
            reportInput: true,
        }
    ),
    "invalid",
    {
        reportInput: true,
    }
)

export const encoding_issue = new SchemaIssue.Encoding(
    S.NumberFromString.ast,
    new SchemaIssue.InvalidValue({
        message: "could not decode the encoded representation",
    }),
    "not-a-number",
    {
        reportInput: true,
    }
)

export const hidden_input_issue = new SchemaIssue.InvalidType(
    S.String.ast,
    "secret-token"
)

export const reported_input_issue = new SchemaIssue.InvalidType(
    S.String.ast,
    "secret-token",
    {
        reportInput: true,
    }
)

export const reported_undefined_issue = new SchemaIssue.InvalidValue(
    {
        expected: "a defined value",
    },
    undefined,
    {
        reportInput: true,
    }
)

type IssueTag = Readonly<{
    _tag: string
}>

export const guard_example = (value: unknown): string => {
    if (!SchemaIssue.isIssue(value)) {
        return "not an Issue"
    }

    const issue = value as unknown as IssueTag

    return issue._tag
}

export const input_reporting_example = (): Readonly<{
    hidden: boolean
    reported: boolean
    undefinedReported: boolean
    undefinedValue: boolean
}> => ({
    hidden: SchemaIssue.hasInput(hidden_input_issue),
    reported: SchemaIssue.hasInput(reported_input_issue),
    undefinedReported: SchemaIssue.hasInput(reported_undefined_issue),
    undefinedValue:
        SchemaIssue.hasInput(reported_undefined_issue) &&
        reported_undefined_issue.input === undefined,
})

export const default_format_example = (): string =>
    format_issue(composite_issue)

export const standard_format_example = (): string =>
    JSON.stringify(format_standard(composite_issue))

export const leaf_hook: SchemaIssue.LeafHook = (
    issue: SchemaIssue.Leaf
): string => `leaf:${issue._tag}`

export const check_hook: SchemaIssue.CheckHook = (
    issue: SchemaIssue.Filter
): string => `check:${issue.filter._tag}`

export const custom_standard_formatter =
    SchemaIssue.makeFormatterStandardSchemaV1({
        leafHook: leaf_hook,
        checkHook: check_hook,
    })

export const custom_format_example = (): string =>
    JSON.stringify(custom_standard_formatter(filter_issue))

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Inspect"),
    S.Literal("Compose"),
    S.Literal("Report"),
    S.Literal("Format"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Inspect",
    "Compose",
    "Report",
    "Format",
]

export const InspectCase = S.Union([
    S.Literal("Type"),
    S.Literal("Value"),
    S.Literal("Missing"),
    S.Literal("Guard"),
])
export type InspectCase = typeof InspectCase.Type

export const inspect_cases: ReadonlyArray<InspectCase> = [
    "Type",
    "Value",
    "Missing",
    "Guard",
]

export const ComposeCase = S.Union([
    S.Literal("Pointer"),
    S.Literal("Composite"),
    S.Literal("Union"),
    S.Literal("Wrappers"),
])
export type ComposeCase = typeof ComposeCase.Type

export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Pointer",
    "Composite",
    "Union",
    "Wrappers",
]

export const ReportCase = S.Union([
    S.Literal("Hidden"),
    S.Literal("Reported"),
    S.Literal("Undefined"),
    S.Literal("Security"),
])
export type ReportCase = typeof ReportCase.Type

export const report_cases: ReadonlyArray<ReportCase> = [
    "Hidden",
    "Reported",
    "Undefined",
    "Security",
]

export const FormatCase = S.Union([
    S.Literal("Default"),
    S.Literal("Standard"),
    S.Literal("LeafHook"),
    S.Literal("CheckHook"),
])
export type FormatCase = typeof FormatCase.Type

export const format_cases: ReadonlyArray<FormatCase> = [
    "Default",
    "Standard",
    "LeafHook",
    "CheckHook",
]

export const Model = S.Struct({
    stage: Stage,
    inspectCase: InspectCase,
    composeCase: ComposeCase,
    reportCase: ReportCase,
    formatCase: FormatCase,
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
        eyebrow:
            "issues are a discriminated tree with leaf nodes for concrete failures",
        title: "Match on _tag before reading issue-specific details",
        description:
            "SchemaIssue.Issue is the root union. Leaf covers terminal failures such as InvalidType, InvalidValue, MissingKey, UnexpectedKey, Forbidden, and OneOf. isIssue narrows unknown values before you inspect _tag, annotations, AST metadata, or union successes.",
        code: `const issue =
    new SchemaIssue.InvalidType(
        Schema.String.ast,
        42,
        { reportInput: true }
    )

if (SchemaIssue.isIssue(issue)) {
    issue._tag
    // "InvalidType"
}`,
        apis: [
            "SchemaIssue.Issue",
            "SchemaIssue.Leaf",
            "SchemaIssue.isIssue",
            "SchemaIssue.InvalidType",
            "SchemaIssue.InvalidValue",
        ],
        notice: "InvalidType means the runtime shape is wrong. InvalidValue means the shape is acceptable but a value-level rule failed. Keeping those separate makes formatter and recovery logic more precise.",
    },

    Compose: {
        eyebrow:
            "non-leaf nodes preserve path, grouping, union, filter, and transformation context",
        title: "Build an issue tree instead of flattening location too early",
        description:
            "Pointer adds a nested path, Composite groups sibling problems, AnyOf represents no union match, and OneOf represents too many union matches. Filter and Encoding wrap an inner issue with the operation that produced it. Formatters recurse through that tree later.",
        code: `const issue =
    new SchemaIssue.Composite(
        User.ast,
        [
            new SchemaIssue.Pointer(
                ["name"],
                new SchemaIssue.InvalidType(
                    Schema.String.ast
                )
            ),
            new SchemaIssue.Pointer(
                ["age"],
                new SchemaIssue.MissingKey(
                    undefined
                )
            )
        ]
    )`,
        apis: [
            "SchemaIssue.Pointer",
            "SchemaIssue.Composite",
            "SchemaIssue.AnyOf",
            "SchemaIssue.OneOf",
            "SchemaIssue.Filter",
            "SchemaIssue.Encoding",
        ],
        notice: "AnyOf and OneOf are opposites: AnyOf means no union member matched; OneOf means more than one member matched when exactly one was required.",
    },

    Report: {
        eyebrow:
            "reportInput controls whether rejected values are retained on value-bearing issues",
        title: "Use hasInput because undefined can itself be the reported input",
        description:
            "When ParseOptions.reportInput is true, eligible issues store input as an enumerable own property. hasInput checks property presence rather than input !== undefined, so it correctly distinguishes no reported input from a reported value that happens to be undefined.",
        code: `const issue =
    new SchemaIssue.InvalidValue(
        { expected: "a value" },
        undefined,
        { reportInput: true }
    )

SchemaIssue.hasInput(issue)
// true

issue.input
// undefined`,
        apis: [
            "SchemaIssue.hasInput",
            "SchemaAST.ParseOptions.reportInput",
            "SchemaIssue.InvalidType",
            "SchemaIssue.InvalidValue",
        ],
        notice: "Input reporting is diagnostic retention, not redaction. Reported values are enumerable and built-in formatters may include them in messages, so do not enable it blindly around secrets, PII, or very large objects.",
    },

    Format: {
        eyebrow:
            "formatters flatten the issue tree only at the presentation boundary",
        title: "Choose human-readable text or Standard Schema V1 output",
        description:
            "makeFormatterDefault produces a multi-line string with accumulated Pointer paths. makeFormatterStandardSchemaV1 returns a structured failure result. LeafHook and CheckHook customize terminal and filter messages while preserving the traversal and path-building behavior.",
        code: `const text =
    SchemaIssue
        .makeFormatterDefault()

const standard =
    SchemaIssue
        .makeFormatterStandardSchemaV1({
            leafHook: issue =>
                \`leaf:\${issue._tag}\`
        })

text(issue)
standard(issue)`,
        apis: [
            "SchemaIssue.makeFormatterDefault",
            "SchemaIssue.makeFormatterStandardSchemaV1",
            "SchemaIssue.Formatter",
            "SchemaIssue.LeafHook",
            "SchemaIssue.CheckHook",
        ],
        notice: "Standard Schema output does not expose input as a separate field, but reported input can still appear inside generated message strings. Custom hooks own their complete message content.",
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
        case "Type":
            return {
                input: "42 against Schema.String",
                operation: "InvalidType",
                result: "Expected string, got 42",
                invariant: "runtime type / shape does not match the AST",
                implementation:
                    "the issue retains the expected AST and optional reported input",
                guidance:
                    "Use InvalidType for shape mismatches, not business constraints.",
            }

        case "Value":
            return {
                input: '"" against a non-empty string rule',
                operation: "InvalidValue",
                result: "Expected a non-empty string",
                invariant:
                    "the runtime type is acceptable but a value rule failed",
                implementation:
                    "message overrides expected, which overrides the generic default",
                guidance:
                    "Use annotations to keep constraint messages close to the rule that produced them.",
            }

        case "Missing":
            return {
                input: "required property absent",
                operation: "MissingKey",
                result: "Missing key",
                invariant: "the leaf itself has no path",
                implementation: "Pointer carries the property / tuple location",
                guidance:
                    "Keep location in Pointer rather than embedding paths into free-form messages.",
            }

        case "Guard":
            return {
                input: "unknown caught value",
                operation: "isIssue(value)",
                result: "narrow to SchemaIssue.Issue",
                invariant: "Issue is a branded discriminated union",
                implementation: "_tag selects the concrete node shape",
                guidance:
                    "Narrow once at the boundary, then switch on _tag for exhaustive issue handling.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Pointer":
            return {
                input: "InvalidType",
                operation: 'Pointer(["user", "name"], issue)',
                result: '... at ["user"]["name"]',
                invariant: "paths are structural data",
                implementation:
                    "nested Pointer paths concatenate during formatting",
                guidance:
                    "Use Pointer to preserve navigable error locations for UIs and Standard Schema consumers.",
            }

        case "Composite":
            return {
                input: "name error + age error",
                operation: "Composite(User.ast, issues)",
                result: "one issue tree · two sibling failures",
                invariant: "Composite contains a non-empty issue list",
                implementation: "formatters recurse into every child",
                guidance:
                    'Collect sibling problems structurally when errors: "all" semantics are useful.',
            }

        case "Union":
            return {
                input: "union candidate",
                operation: "AnyOf / OneOf",
                result: "none matched / too many matched",
                invariant: "the union AST remains attached to the issue",
                implementation:
                    "AnyOf stores failures; OneOf stores successful member ASTs",
                guidance:
                    "Do not collapse union diagnostics into one generic invalid-value message before formatting.",
            }

        case "Wrappers":
            return {
                input: "inner InvalidValue",
                operation: "Filter / Encoding",
                result: "operation context + inner issue",
                invariant: "wrappers do not replace the underlying reason",
                implementation:
                    "default formatting can unwrap or specialize the outer node",
                guidance:
                    "Inspect wrappers when recovery depends on whether validation or transformation failed.",
            }
    }
}

export const report_snapshot = (model: Model): Snapshot => {
    switch (model.reportCase) {
        case "Hidden":
            return {
                input: '"secret-token"',
                operation: "reportInput omitted / false",
                result: "hasInput(issue) → false",
                invariant: "the issue need not retain rejected data",
                implementation:
                    "default messages omit the value when no input property exists",
                guidance:
                    "Prefer the default when the rejected value is not required for diagnostics.",
            }

        case "Reported":
            return {
                input: '"secret-token"',
                operation: "reportInput: true",
                result: "enumerable issue.input",
                invariant: "input is retained by reference",
                implementation:
                    "default formatting may include the retained value",
                guidance:
                    "Enable only where the disclosure and retention cost is understood.",
            }

        case "Undefined":
            return {
                input: "undefined",
                operation: "hasInput(issue)",
                result: "true even though issue.input === undefined",
                invariant: "presence and value are different questions",
                implementation: "hasInput checks Object.hasOwn",
                guidance:
                    "Never use issue.input !== undefined as the presence test.",
            }

        case "Security":
            return {
                input: "PII / secrets / large object graph",
                operation: "reportInput + formatter",
                result: "possible retention or disclosure",
                invariant:
                    "SchemaIssue is diagnostics, not a sanitization boundary",
                implementation:
                    "custom annotations and messages are also caller-controlled",
                guidance:
                    "Keep secrets out of reported input and custom messages unless disclosure is explicitly intended.",
            }
    }
}

export const format_snapshot = (model: Model): Snapshot => {
    switch (model.formatCase) {
        case "Default":
            return {
                input: "nested Composite / Pointer tree",
                operation: "makeFormatterDefault()",
                result: "multi-line developer-facing string",
                invariant: "paths are accumulated during recursion",
                implementation: "multiple leaves become multiple lines",
                guidance:
                    "Use this for logs, CLI output, and SchemaError.message-style diagnostics.",
            }

        case "Standard":
            return {
                input: "same issue tree",
                operation: "makeFormatterStandardSchemaV1()",
                result: "{ issues: [{ path, message }, ...] }",
                invariant:
                    "the tree is flattened into Standard Schema issue entries",
                implementation:
                    "reported input may be embedded in message but is not a separate output field",
                guidance:
                    "Use this at interoperability boundaries that understand Standard Schema V1.",
            }

        case "LeafHook":
            return {
                input: "terminal Leaf node",
                operation: "custom leafHook",
                result: 'message = "leaf:<tag>"',
                invariant: "the hook receives only terminal issue variants",
                implementation:
                    "Pointer path traversal is still handled by the formatter",
                guidance:
                    "Customize wording without reimplementing the issue-tree walker.",
            }

        case "CheckHook":
            return {
                input: "Filter wrapper",
                operation: "custom checkHook",
                result: 'message = "check:Filter"',
                invariant:
                    "return undefined to fall back to built-in filter formatting",
                implementation: "defaultCheckHook prefers annotated messages",
                guidance:
                    "Override only refinement-check wording; let the default traversal handle nested issue structure.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchemaIssueStage: {
        stage: Stage,
    },
    SelectedSchemaIssueInspectCase: {
        inspectCase: InspectCase,
    },
    SelectedSchemaIssueComposeCase: {
        composeCase: ComposeCase,
    },
    SelectedSchemaIssueReportCase: {
        reportCase: ReportCase,
    },
    SelectedSchemaIssueFormatCase: {
        formatCase: FormatCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Inspect",
    inspectCase: "Type",
    composeCase: "Pointer",
    reportCase: "Hidden",
    formatCase: "Default",
})

type StagePayload = Readonly<{
    stage: Stage
}>
type InspectCasePayload = Readonly<{
    inspectCase: InspectCase
}>
type ComposeCasePayload = Readonly<{
    composeCase: ComposeCase
}>
type ReportCasePayload = Readonly<{
    reportCase: ReportCase
}>
type FormatCasePayload = Readonly<{
    formatCase: FormatCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchemaIssueStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchemaIssueInspectCase: ({
            inspectCase,
        }: InspectCasePayload) => ({
            model: modifyFields(model, {
                inspectCase: () => inspectCase,
            }),
        }),

        SelectedSchemaIssueComposeCase: ({
            composeCase,
        }: ComposeCasePayload) => ({
            model: modifyFields(model, {
                composeCase: () => composeCase,
            }),
        }),

        SelectedSchemaIssueReportCase: ({ reportCase }: ReportCasePayload) => ({
            model: modifyFields(model, {
                reportCase: () => reportCase,
            }),
        }),

        SelectedSchemaIssueFormatCase: ({ formatCase }: FormatCasePayload) => ({
            model: modifyFields(model, {
                formatCase: () => formatCase,
            }),
        }),
    })
