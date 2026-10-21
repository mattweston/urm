import { Array, Option, Schema as S } from "effect"

import { decodeDocument, MarkdownDocument } from "@foldkit/markdown"

import aboutRaw from "./content/about.md"
import markdownInTheModelRaw from "./content/markdown-in-the-model.md"
import markdownInTheModelHighlights from "./content/markdown-in-the-model.md?highlight"
import writingWithDirectivesRaw from "./content/writing-with-directives.md"
import writingWithDirectivesHighlights from "./content/writing-with-directives.md?highlight"
import { postMeta, type PostMeta } from "./posts.ts"

// Shiki output for the fences in a document, keyed by the code itself. Built
// alongside the document at build time, so no highlighter reaches the browser.
export const HighlightedCode = S.Record(S.String, S.String)
export type HighlightedCode = typeof HighlightedCode.Type

// The Vite plugin hands back an encoded document, so it is decoded once here
// rather than checked at every render. A file that no longer matches the schema
// fails at module load, not halfway down a page.
export const about: MarkdownDocument = decodeDocument(aboutRaw)

// No fences in the about page, so nothing to highlight.
export const aboutHighlightedCode: HighlightedCode = {}

export const Post = S.Struct({
    slug: S.String,
    title: S.String,
    publishedOn: S.String,
    summary: S.String,
    document: MarkdownDocument,
    highlightedCode: HighlightedCode,
})
export type Post = typeof Post.Type

// The compiled markdown for each slug in posts.ts. Keeping the metadata in a
// module free of .md imports is what lets the Astro page prerender a document
// per post: the slugs are a known set, unlike a person id or a gallery frame.
const CONTENT_BY_SLUG: Readonly<
    Record<string, Readonly<{ raw: unknown; highlightedCode: HighlightedCode }>>
> = {
    "markdown-in-the-model": {
        raw: markdownInTheModelRaw,
        highlightedCode: markdownInTheModelHighlights,
    },
    "writing-with-directives": {
        raw: writingWithDirectivesRaw,
        highlightedCode: writingWithDirectivesHighlights,
    },
}

const toPost = (meta: PostMeta): Post => {
    const content = CONTENT_BY_SLUG[meta.slug]

    if (content === undefined) {
        throw new Error(`The post "${meta.slug}" has no markdown behind it.`)
    }

    return {
        ...meta,
        document: decodeDocument(content.raw),
        highlightedCode: content.highlightedCode,
    }
}

export const posts: ReadonlyArray<Post> = Array.map(postMeta, toPost)

export const findPost = (slug: string): Option.Option<Post> =>
    Array.findFirst(posts, (post) => post.slug === slug)
