/** # Schemas contracts */
import { Effect, Schema } from "effect"

import { RichTextContent, RichTextDocument } from "./rich-text.ts"

/**
 * Validates a document title of at most 500 characters.
 * Empty strings and surrounding whitespace are accepted without normalization.
 */
export const DocumentTitle = Schema.String.check(Schema.isMaxLength(500))
export type DocumentTitle = typeof DocumentTitle.Type

/**
 * Validates serialized document content of at most 750,000 characters.
 * Accepts empty strings and preserves whitespace. Rich-text content enters
 * this boundary as a JSON string; use decodeDocumentContent to interpret it.
 */
export const DocumentContent = Schema.String.check(Schema.isMaxLength(750_000))
export type DocumentContent = typeof DocumentContent.Type

/**
 * Supported serialized input formats. A rich_text_json value is still a string
 * at the input boundary; {@link decodeDocumentContent} produces structured content.
 */
export const DocumentContentType = Schema.Literals([
    "markdown",
    "html",
    "text",
    "rtf",
    "rich_text_json",
])
export type DocumentContentType = typeof DocumentContentType.Type

export const ContentType = DocumentContentType
export type ContentType = DocumentContentType

/**
 * Validates a URL slug of 1–500 lowercase ASCII letters or digits, with single
 * hyphens between groups. Rejects surrounding whitespace rather than trimming
 * it. Uniqueness and reserved route names must be checked by the caller.
 */
export const DocumentSlug = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500),
    Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
)
export type DocumentSlug = typeof DocumentSlug.Type

export const Document = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    content: Schema.String,
    content_type: DocumentContentType,
    slug: Schema.optional(Schema.String),
    published: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Document = typeof Document.Type

// #region document-content-input
/**
 * Validates the outer document-content input: a supported content_type and a
 * content string of at most 750,000 characters. Both fields are required.
 *
 * Accepts markdown, html, text, rtf and rich_text_json. Empty content and
 * surrounding whitespace are preserved. This schema does not parse JSON or
 * validate its rich-text structure; pass the decoded input to
 * decodeDocumentContent for that second step.
 */
export const DocumentContentInput = Schema.Struct({
    content_type: DocumentContentType,
    content: DocumentContent,
})
export type DocumentContentInput = typeof DocumentContentInput.Type
// #endregion document-content-input

export const TextDocumentContent = Schema.Struct({
    content_type: Schema.Literals(["markdown", "html", "text", "rtf"]),
    content: DocumentContent,
})
export type TextDocumentContent = typeof TextDocumentContent.Type

export const RichTextJsonDocumentContent = Schema.Struct({
    content_type: Schema.Literal("rich_text_json"),
    content: RichTextContent,
})
export type RichTextJsonDocumentContent =
    typeof RichTextJsonDocumentContent.Type

export const DecodedDocumentContent = Schema.Union([
    TextDocumentContent,
    RichTextJsonDocumentContent,
])
export type DecodedDocumentContent = typeof DecodedDocumentContent.Type

/**
 * Reports invalid JSON or a rich-text schema mismatch from decodeDocumentContent.
 * Carries the requested content_type and a diagnostic message. Outer input
 * validation failures are schema errors, not DocumentContentDecodeError.
 */
export class DocumentContentDecodeError extends Schema.TaggedError<DocumentContentDecodeError>()(
    "DocumentContentDecodeError",
    {
        content_type: DocumentContentType,
        message: Schema.String,
    }
) {}

const LegacyRichTextContent = Schema.Struct({
    document: RichTextDocument,
})

// #region decode-document-content
/**
 * Interprets already-validated DocumentContentInput without requiring services.
 * Validate unknown input with DocumentContentInput before calling this function;
 * the typed parameter does not enforce the outer schema at runtime.
 *
 * Markdown, HTML, text and RTF strings return unchanged. Rich-text JSON is
 * parsed and checked against RichTextContent or the legacy document wrapper.
 * Legacy content receives schema_version: 1. Invalid JSON or structure fails
 * with DocumentContentDecodeError.
 *
 * This operation does not sanitize HTML, authorize access or persist content.
 */
export const decodeDocumentContent = Effect.fn("DocumentContent.decode")(
    function* (input: DocumentContentInput) {
        if (input.content_type !== "rich_text_json") {
            return {
                content_type: input.content_type,
                content: input.content,
            } satisfies TextDocumentContent
        }

        const parsed = yield* Effect.try({
            try: () => JSON.parse(input.content),
            catch: () =>
                new DocumentContentDecodeError({
                    content_type: input.content_type,
                    message: "Document content is not valid JSON",
                }),
        })
        const decoded = yield* Schema.decodeUnknownEffect(
            Schema.Union([RichTextContent, LegacyRichTextContent])
        )(parsed).pipe(
            Effect.mapError(
                () =>
                    new DocumentContentDecodeError({
                        content_type: input.content_type,
                        message:
                            "Document content does not match the rich-text schema",
                    })
            )
        )

        const content: RichTextContent =
            "schema_version" in decoded
                ? decoded
                : { schema_version: 1, ...decoded }

        return {
            content_type: input.content_type,
            content,
        } satisfies RichTextJsonDocumentContent
    }
)
// #endregion decode-document-content

export const CreateDocumentInput = Schema.Struct({
    id: Schema.String,
    title: DocumentTitle,
    content: DocumentContent,
    content_type: ContentType,
    slug: Schema.optional(DocumentSlug),
    published: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})

export type CreateDocumentInput = Schema.Schema.Type<typeof CreateDocumentInput>

export const UpdateDocumentInput = Schema.Struct({
    id: Schema.String,
    title: Schema.optional(DocumentTitle),
    content: Schema.optional(DocumentContent),
    content_type: Schema.optional(ContentType),
    slug: Schema.optional(DocumentSlug),
    published: Schema.optional(Schema.Boolean),
    updated_at: Schema.Number,
})

export type UpdateDocumentInput = Schema.Schema.Type<typeof UpdateDocumentInput>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
