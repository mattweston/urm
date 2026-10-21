import { JsonPointer, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Tokens"),
    S.Literal("Format"),
    S.Literal("Parse"),
    S.Literal("EdgeCases"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Tokens",
    "Format",
    "Parse",
    "EdgeCases",
]

export const TokenCase = S.Union([
    S.Literal("Slash"),
    S.Literal("Tilde"),
    S.Literal("Mixed"),
    S.Literal("Unicode"),
])
export type TokenCase = typeof TokenCase.Type

export const FormatCase = S.Union([
    S.Literal("Path"),
    S.Literal("Root"),
    S.Literal("Reserved"),
])
export type FormatCase = typeof FormatCase.Type

export const ParseCase = S.Union([
    S.Literal("Decoded"),
    S.Literal("EncodedSeparator"),
    S.Literal("EscapedSlash"),
])
export type ParseCase = typeof ParseCase.Type

export const EdgeCase = S.Union([
    S.Literal("Invalid"),
    S.Literal("RoundTrip"),
    S.Literal("Surrogate"),
])
export type EdgeCase = typeof EdgeCase.Type

export const Model = S.Struct({
    stage: Stage,
    tokenCase: TokenCase,
    formatCase: FormatCase,
    parseCase: ParseCase,
    edgeCase: EdgeCase,
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
    Tokens: {
        eyebrow: "RFC 6901 reference tokens",
        title: "Escape one path segment before joining it into a JSON Pointer",
        description:
            "escapeToken encodes only JSON Pointer's two special token characters: '~' becomes '~0' and '/' becomes '~1'. unescapeToken performs the inverse in the required order.",
        code: `JsonPointer.escapeToken(
    "path/to~key"
)
// "path~1to~0key"

JsonPointer.unescapeToken(
    "path~1to~0key"
)
// "path/to~key"

JsonPointer.unescapeToken(
    JsonPointer.escapeToken(
        "a~b/c"
    )
)
// "a~b/c"`,
        apis: ["JsonPointer.escapeToken", "JsonPointer.unescapeToken"],
        notice: "Escaping and URI percent-encoding are separate layers. escapeToken does not percent-encode spaces, Unicode, '#', or '%'; it only applies JSON Pointer token escaping.",
    },

    Format: {
        eyebrow: "tokens → URI fragment",
        title: "formatUriFragment escapes JSON Pointer tokens before percent-encoding",
        description:
            "formatUriFragment takes decoded path tokens, applies RFC 6901 token escaping, then URI-encodes each segment. An empty path represents the document root and formats as '#'.",
        code: `JsonPointer.formatUriFragment([
    "$defs",
    "a b",
    "a%b",
    "a/b",
    "café",
    "a#b"
])
// "#/$defs/a%20b/a%25b/a~1b/caf%C3%A9/a%23b"

JsonPointer.formatUriFragment([])
// "#"`,
        apis: ["JsonPointer.formatUriFragment", "JsonPointer.escapeToken"],
        notice: "JSON Pointer escaping happens before URI encoding. A literal slash inside one token becomes '~1'; a slash introduced by URI-decoding separates path tokens.",
    },

    Parse: {
        eyebrow: "URI fragment → tokens",
        title: "parseUriFragment percent-decodes first, then splits and unescapes tokens",
        description:
            "parseUriFragment accepts a JSON Pointer URI fragment and returns decoded path tokens. Both '' and '#' represent the document root; invalid fragments return undefined rather than throwing.",
        code: `JsonPointer.parseUriFragment(
    "#/users/a~1b"
)
// ["users", "a/b"]

JsonPointer.parseUriFragment(
    "#/caf%C3%A9"
)
// ["café"]

JsonPointer.parseUriFragment(
    "#%2Fdefinitions%2FValue"
)
// ["definitions", "Value"]`,
        apis: ["JsonPointer.parseUriFragment", "JsonPointer.unescapeToken"],
        notice: "Percent-decoding happens before splitting. Therefore '%2F' becomes a path separator, while '~1' stays inside a token and decodes to a literal '/'.",
    },

    EdgeCases: {
        eyebrow: "validation + round trips",
        title: "Invalid fragments return undefined; invalid UTF-16 input can make formatting throw URIError",
        description:
            "parseUriFragment validates fragment syntax, percent-encoding, URI-required escaping, and JSON Pointer '~0' / '~1' escapes. formatUriFragment is the inverse for valid tokens but URI encoding rejects unpaired surrogates.",
        code: `JsonPointer.parseUriFragment(
    "/a"
)
// undefined

JsonPointer.parseUriFragment(
    "#/a~2b"
)
// undefined

const path = [
    "a/b",
    "c~d",
    "café"
]

JsonPointer.parseUriFragment(
    JsonPointer.formatUriFragment(
        path
    )
)
// same tokens`,
        apis: [
            "JsonPointer.parseUriFragment",
            "JsonPointer.formatUriFragment",
            "JsonPointer.escapeToken",
            "JsonPointer.unescapeToken",
        ],
        notice: "parseUriFragment uses undefined for invalid input, while formatUriFragment may throw URIError for an unpaired surrogate. For valid strings, format → parse and escape → unescape round trip.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const array_text = (values: ReadonlyArray<string> | undefined): string =>
    values === undefined
        ? "undefined"
        : `[${values.map((value: string) => JSON.stringify(value)).join(", ")}]`

// -----------------------------------------------------------------------------
// TOKENS SNAPSHOT
// -----------------------------------------------------------------------------

export type TokenSnapshot = Readonly<{
    mode: TokenCase
    input: string
    escaped: string
    unescaped: string
    roundTrip: boolean
    unchangedCharacters: string
}>

export const token_snapshot = (model: Model): TokenSnapshot => {
    const input =
        model.tokenCase === "Slash"
            ? "a/b/c"
            : model.tokenCase === "Tilde"
              ? "a~b~c"
              : model.tokenCase === "Unicode"
                ? "世界/🌍~key"
                : "path/to~key"

    const escaped = JsonPointer.escapeToken(input)

    const unescaped = JsonPointer.unescapeToken(escaped)

    return {
        mode: model.tokenCase,
        input,
        escaped,
        unescaped,
        roundTrip: unescaped === input,
        unchangedCharacters: JsonPointer.escapeToken("a b#c%d?e"),
    }
}

// -----------------------------------------------------------------------------
// FORMAT SNAPSHOT
// -----------------------------------------------------------------------------

export type FormatSnapshot = Readonly<{
    mode: FormatCase
    tokens: string
    fragment: string
    parsedBack: string
    root: string
    ordering: string
}>

export const format_snapshot = (model: Model): FormatSnapshot => {
    const tokens: ReadonlyArray<string> =
        model.formatCase === "Root"
            ? []
            : model.formatCase === "Reserved"
              ? ["!$&'()*+,;=:@?", "a#b", "Rate%"]
              : ["$defs", "a b", "a%b", "a/b", "café", "a#b"]

    const fragment = JsonPointer.formatUriFragment(tokens)

    return {
        mode: model.formatCase,
        tokens: array_text(tokens),
        fragment,
        parsedBack: array_text(JsonPointer.parseUriFragment(fragment)),
        root: JsonPointer.formatUriFragment([]),
        ordering: "escapeToken → URI percent-encoding",
    }
}

// -----------------------------------------------------------------------------
// PARSE SNAPSHOT
// -----------------------------------------------------------------------------

export type ParseSnapshot = Readonly<{
    mode: ParseCase
    fragment: string
    tokens: string
    comparisonFragment: string
    comparisonTokens: string
    rootEmpty: string
    rootHash: string
}>

export const parse_snapshot = (model: Model): ParseSnapshot => {
    const fragment =
        model.parseCase === "EncodedSeparator"
            ? "#/$defs/Box%2Fproperties%2Fvalue"
            : model.parseCase === "EscapedSlash"
              ? "#/$defs/Box~1properties~1value"
              : "#/definitions/a%20b/caf%C3%A9"

    const comparisonFragment =
        model.parseCase === "EncodedSeparator"
            ? "#/$defs/Box~1properties~1value"
            : "#%2Fdefinitions%2FValue"

    return {
        mode: model.parseCase,
        fragment,
        tokens: array_text(JsonPointer.parseUriFragment(fragment)),
        comparisonFragment,
        comparisonTokens: array_text(
            JsonPointer.parseUriFragment(comparisonFragment)
        ),
        rootEmpty: array_text(JsonPointer.parseUriFragment("")),
        rootHash: array_text(JsonPointer.parseUriFragment("#")),
    }
}

// -----------------------------------------------------------------------------
// EDGE CASE SNAPSHOT
// -----------------------------------------------------------------------------

const invalid_fragments: ReadonlyArray<string> = [
    "/a",
    "#/%",
    "#/%FF",
    "#/a b",
    "#/a#b",
    "#/a\\b",
    "#/café",
    "#/a~2b",
    "#/a~",
]

export type EdgeSnapshot = Readonly<{
    mode: EdgeCase
    invalidResults: string
    path: string
    formatted: string
    parsed: string
    roundTrip: boolean
    tokenRoundTrip: boolean
    surrogateError: string
}>

export const edge_snapshot = (model: Model): EdgeSnapshot => {
    const path: ReadonlyArray<string> = ["", "a/b", "c~d", "café", "世界", "🚀"]

    const formatted = JsonPointer.formatUriFragment(path)

    const parsed = JsonPointer.parseUriFragment(formatted)

    const token = "~01/a~10"

    const tokenRoundTrip =
        JsonPointer.unescapeToken(JsonPointer.escapeToken(token)) === token

    let surrogateError = "no error"

    try {
        JsonPointer.formatUriFragment([String.fromCharCode(0xd800)])
    } catch (error: unknown) {
        surrogateError = error instanceof URIError ? "URIError" : String(error)
    }

    return {
        mode: model.edgeCase,
        invalidResults: invalid_fragments
            .map(
                (fragment: string) =>
                    `${JSON.stringify(fragment)} → ${String(
                        JsonPointer.parseUriFragment(fragment)
                    )}`
            )
            .join("\n"),
        path: array_text(path),
        formatted,
        parsed: array_text(parsed),
        roundTrip:
            parsed !== undefined &&
            JSON.stringify(parsed) === JSON.stringify(path),
        tokenRoundTrip,
        surrogateError,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedJsonPointerStage: {
        stage: Stage,
    },
    SelectedJsonPointerTokenCase: {
        tokenCase: TokenCase,
    },
    SelectedJsonPointerFormatCase: {
        formatCase: FormatCase,
    },
    SelectedJsonPointerParseCase: {
        parseCase: ParseCase,
    },
    SelectedJsonPointerEdgeCase: {
        edgeCase: EdgeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Tokens",
    tokenCase: "Mixed",
    formatCase: "Path",
    parseCase: "Decoded",
    edgeCase: "Invalid",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type TokenCasePayload = Readonly<{
    tokenCase: TokenCase
}>

type FormatCasePayload = Readonly<{
    formatCase: FormatCase
}>

type ParseCasePayload = Readonly<{
    parseCase: ParseCase
}>

type EdgeCasePayload = Readonly<{
    edgeCase: EdgeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedJsonPointerStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedJsonPointerTokenCase: ({ tokenCase }: TokenCasePayload) => ({
            model: modifyFields(model, {
                tokenCase: () => tokenCase,
            }),
        }),

        SelectedJsonPointerFormatCase: ({ formatCase }: FormatCasePayload) => ({
            model: modifyFields(model, {
                formatCase: () => formatCase,
            }),
        }),

        SelectedJsonPointerParseCase: ({ parseCase }: ParseCasePayload) => ({
            model: modifyFields(model, {
                parseCase: () => parseCase,
            }),
        }),

        SelectedJsonPointerEdgeCase: ({ edgeCase }: EdgeCasePayload) => ({
            model: modifyFields(model, {
                edgeCase: () => edgeCase,
            }),
        }),
    })
