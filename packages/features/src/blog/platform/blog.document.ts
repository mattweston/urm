import { Schema as S } from "effect"

import {
    RichTextContentSchemaVersion,
    RichTextDocument,
} from "@urm/domain/schemas/rich-text"

export const BLOG_DOCUMENT_ID = "blog:urm:draft"
export const BLOG_ENTITY_TYPE = "document"
export const DEFAULT_BLOG_TAG_COLOR = "var(--primary)"

const LegacyBlogDocumentContent = S.Struct({
    author: S.String,
    document: RichTextDocument,
})

const BlogDocumentContent = S.Struct({
    schema_version: RichTextContentSchemaVersion,
    ...LegacyBlogDocumentContent.fields,
    tags: S.optionalKey(S.Array(S.String)),
})

type BlogDocumentContent = typeof BlogDocumentContent.Type
type LegacyBlogDocumentContent = typeof LegacyBlogDocumentContent.Type

export const createBlogDocumentId = (pathname: string): string => {
    const segments = pathname.split("/").filter((segment) => segment.length > 0)

    if (segments[0] !== "blog" || segments[1] !== "urm") {
        return BLOG_DOCUMENT_ID
    }

    const slug = segments[2]

    if (slug === undefined || slug.length === 0 || slug === "new") {
        return BLOG_DOCUMENT_ID
    }

    return `blog:urm:${slug}`
}

export const parseBlogDocumentContent = (
    content: string
): BlogDocumentContent | null => {
    try {
        const unknownContent: unknown = JSON.parse(content)

        const decoded = S.decodeUnknownSync(
            S.Union([BlogDocumentContent, LegacyBlogDocumentContent])
        )(unknownContent)

        return "schema_version" in decoded
            ? decoded
            : { schema_version: 1, ...decoded }
    } catch {
        return null
    }
}

export const serializeBlogDocumentContent = (
    content: LegacyBlogDocumentContent & {
        readonly tags?: ReadonlyArray<string>
    }
): string => JSON.stringify({ schema_version: 1, ...content })

export const uniqueBlogTagNames = (
    tagNames: ReadonlyArray<string>
): ReadonlyArray<string> =>
    globalThis.Array.from(
        new Set(
            tagNames
                .map((tagName) => tagName.trim())
                .filter((tagName) => tagName.length > 0)
        )
    )
