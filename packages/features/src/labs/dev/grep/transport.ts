import { Schema } from "effect"
import { DocumentationSection, SyntaxToken } from "./data.ts"

const Offset = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(1_000_000)
)
export const SearchRequest = Schema.Struct({
    doc_path: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048))),
    doc_heading: Schema.optionalKey(
        Schema.String.check(Schema.isMaxLength(2048))
    ),
    doc_source: Schema.optionalKey(
        Schema.Literals(["all", "urm", "effect", "foldkit", "foldkit-plus"])
    ),
    repo_source: Schema.optionalKey(
        Schema.Literals(["all", "urm", "effect", "foldkit", "foldkit-plus"])
    ),
    query: Schema.String.check(Schema.isMaxLength(2048)),
    selected: Schema.String.check(Schema.isMaxLength(2048)),
    file_offset: Offset,
    match_offsets: Schema.Record(Schema.String, Offset),
    doc_offset: Offset,
    snapshot: Schema.String,
})
export type SearchRequest = typeof SearchRequest.Type
export const CodeMatch = Schema.Struct({
    id: Schema.String,
    path: Schema.String,
    line: Schema.Number,
    column: Schema.Number,
    text: Schema.String,
    start: Schema.Number,
    end: Schema.Number,
})
export type CodeMatch = typeof CodeMatch.Type
export const CodeGroup = Schema.Struct({
    path: Schema.String,
    origin: Schema.String,
    occurrences: Schema.Number,
    shown_matches: Schema.Number,
    offset: Schema.Number,
    blocks: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            lines: Schema.Array(
                Schema.Struct({
                    number: Schema.Number,
                    text: Schema.String,
                    tokens: Schema.optionalKey(Schema.Array(SyntaxToken)),
                    matches: Schema.Array(CodeMatch),
                })
            ),
        })
    ),
})
export type CodeGroup = typeof CodeGroup.Type
export const SearchResponse = Schema.Struct({
    snapshot: Schema.String,
    occurrences: Schema.Number,
    files: Schema.Number,
    file_offset: Schema.Number,
    doc_offset: Schema.Number,
    section_count: Schema.Number,
    selected: Schema.optionalKey(CodeMatch),
    groups: Schema.Array(CodeGroup),
    sections: Schema.Array(
        Schema.Struct({
            section: DocumentationSection,
            reason: Schema.String,
            rank: Schema.Number,
        })
    ),
    diagnostics: Schema.Array(Schema.String),
    origins: Schema.Array(Schema.String),
})
export type SearchResponse = typeof SearchResponse.Type

export const SuggestRequest = Schema.Struct({
    query: Schema.String.check(Schema.isMaxLength(2048)),
})
export const SuggestResponse = Schema.Struct({
    suggestions: Schema.Array(Schema.String),
})
