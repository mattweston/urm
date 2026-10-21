/** # Structured rich-text values, independent of editor and renderer */
import * as Schema from "effect/Schema"

export const RichTextBoldMark = Schema.Struct({
    type: Schema.Literal("bold"),
})
export type RichTextBoldMark = typeof RichTextBoldMark.Type

export const RichTextItalicMark = Schema.Struct({
    type: Schema.Literal("italic"),
})
export type RichTextItalicMark = typeof RichTextItalicMark.Type

/**
 * Link annotation on a rich-text text node. href is a plain string, including
 * empty strings; decoding this mark does not validate URL schemes or make a
 * destination safe to render. The consuming renderer owns that policy.
 */
export const RichTextLinkMark = Schema.Struct({
    type: Schema.Literal("link"),
    href: Schema.String,
})
export type RichTextLinkMark = typeof RichTextLinkMark.Type

export const RichTextMark = Schema.Union([
    RichTextBoldMark,
    RichTextItalicMark,
    RichTextLinkMark,
])
export type RichTextMark = typeof RichTextMark.Type

/**
 * Inline text with optional bold, italic or link annotations. Text may be
 * empty. Marks may be absent or an empty array, and duplicate marks are not
 * rejected. Inline nodes contain text rather than nested child nodes.
 */
export const RichTextTextNode = Schema.Struct({
    type: Schema.Literal("text"),
    text: Schema.String,
    marks: Schema.optional(Schema.Array(RichTextMark)),
})
export type RichTextTextNode = typeof RichTextTextNode.Type

export const RichTextHeadingLevel = Schema.Union([
    Schema.Literal(1),
    Schema.Literal(2),
    Schema.Literal(3),
])
export type RichTextHeadingLevel = typeof RichTextHeadingLevel.Type

export const RichTextParagraphNode = Schema.Struct({
    type: Schema.Literal("paragraph"),
    children: Schema.Array(RichTextTextNode),
})
export type RichTextParagraphNode = typeof RichTextParagraphNode.Type

export const RichTextHeadingNode = Schema.Struct({
    type: Schema.Literal("heading"),
    level: RichTextHeadingLevel,
    children: Schema.Array(RichTextTextNode),
})
export type RichTextHeadingNode = typeof RichTextHeadingNode.Type

export const RichTextBlockquoteNode = Schema.Struct({
    type: Schema.Literal("blockquote"),
    children: Schema.Array(RichTextTextNode),
})
export type RichTextBlockquoteNode = typeof RichTextBlockquoteNode.Type

/**
 * Standalone image block with required src and alt strings. Both can be empty;
 * this schema does not validate a URL, verify media ownership or fetch the
 * image. Images have no child nodes in URM's rich-text format.
 */
export const RichTextImageNode = Schema.Struct({
    type: Schema.Literal("image"),
    src: Schema.String,
    alt: Schema.String,
})
export type RichTextImageNode = typeof RichTextImageNode.Type

export const RichTextBlockNode = Schema.Union([
    RichTextParagraphNode,
    RichTextHeadingNode,
    RichTextBlockquoteNode,
    RichTextImageNode,
])
export type RichTextBlockNode = typeof RichTextBlockNode.Type

/**
 * Root of URM's constrained rich-text tree. Children are paragraphs, headings
 * at levels 1–3, blockquotes or images. Text-bearing blocks contain inline text
 * nodes, so nested blocks and list structures are not supported by this schema.
 * An empty document is valid; this schema imposes no block-count limit.
 */
export const RichTextDocument = Schema.Struct({
    type: Schema.Literal("doc"),
    children: Schema.Array(RichTextBlockNode),
})
export type RichTextDocument = typeof RichTextDocument.Type

/** Format discriminator, not an edit revision; legacy adaptation belongs to the document decoder. */
export const RichTextContentSchemaVersion = Schema.Literal(1)
export type RichTextContentSchemaVersion =
    typeof RichTextContentSchemaVersion.Type

/**
 * Versioned rich-text envelope containing a RichTextDocument and the required
 * schema_version: 1. This schema accepts an object, not a serialized JSON
 * string. Use decodeDocumentContent at the document-content boundary to parse
 * JSON and adapt the legacy wrapper that omits schema_version.
 */
export const RichTextContent = Schema.Struct({
    schema_version: RichTextContentSchemaVersion,
    document: RichTextDocument,
})
export type RichTextContent = typeof RichTextContent.Type
