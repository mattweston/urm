import { Schema } from "effect"
import { MarkdownDocument } from "@foldkit/markdown"

export const SyntaxToken = Schema.Struct({
    text: Schema.String,
    color: Schema.String,
})
export type SyntaxToken = typeof SyntaxToken.Type

export const SourceFile = Schema.Struct({
    path: Schema.String,
    text: Schema.String,
    tokens: Schema.optionalKey(Schema.Array(Schema.Array(SyntaxToken))),
})
export type SourceFile = typeof SourceFile.Type
export const Association = Schema.Struct({
    source_path: Schema.String,
    region: Schema.optionalKey(Schema.String),
    start_line: Schema.Number,
    end_line: Schema.Number,
    reason: Schema.Literals(["Documents this region", "Same source file"]),
})
export const DocumentationSection = Schema.Struct({
    id: Schema.String,
    path: Schema.String,
    title: Schema.String,
    page_title: Schema.optionalKey(Schema.String),
    aliases: Schema.optionalKey(Schema.Array(Schema.String)),
    text: Schema.String,
    associations: Schema.Array(Association),
    document: Schema.optionalKey(MarkdownDocument),
    highlights: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
})
export type DocumentationSection = typeof DocumentationSection.Type
export const Preview = Schema.Struct({
    snapshot: Schema.String,
    files: Schema.Array(SourceFile),
    sections: Schema.Array(DocumentationSection),
    diagnostics: Schema.Array(Schema.String),
})
export type Preview = typeof Preview.Type
