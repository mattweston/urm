import * as Markdown from "@foldkit/markdown"
import { parseMarkdown } from "@foldkit/markdown/vite"
import { Effect, Schema } from "effect"
import { type Document, type Html, type HtmlBuilder } from "foldkit/html"
import { renderToString } from "foldkit/experimental/server"
import { decodeDocumentContent } from "@urm/domain/schemas/documents"
import {
    RichTextDocument,
    type RichTextMark,
    type RichTextTextNode,
} from "@urm/domain/schemas/rich-text"

import { PageRenderError } from "./errors.ts"
import { PublishedPage } from "./snapshot.ts"
import type { PublishedSiteLayout } from "@urm/domain/schemas/document-site-builds"
import { renderSiteLayout } from "./site-layout.ts"
import { renderComposedPage } from "./composed-page-renderer.ts"
import type { PublishedPage as PublishedPageType } from "./snapshot.ts"

const Message = Schema.Struct({ _tag: Schema.Literal("Noop") })
type Message = typeof Message.Type

const MarkdownPage = Schema.Struct({
    page: PublishedPage,
    document: Markdown.MarkdownDocument,
})
type MarkdownPage = typeof MarkdownPage.Type

const RichTextPage = Schema.Struct({
    page: PublishedPage,
    document: RichTextDocument,
})
type RichTextPage = typeof RichTextPage.Type

const markdown_application = {
    Flags: MarkdownPage,
    init: (flags: MarkdownPage) => ({
        model: flags,
        commands: [],
    }),
    view: (flags: MarkdownPage, h: HtmlBuilder<Message>): Document => ({
        title: flags.page.title,
        body: h.main(
            [h.Class("site-page")],
            [h.h1([], [flags.page.heading]), Markdown.view(flags.document)]
        ),
    }),
}

const text_application = {
    Flags: PublishedPage,
    init: (page: PublishedPageType) => ({
        model: page,
        commands: [],
    }),
    view: (page: PublishedPageType, h: HtmlBuilder<Message>): Document => ({
        title: page.title,
        body: h.main(
            [h.Class("site-page")],
            [
                h.h1([], [page.heading]),
                ...page.body
                    .split(/\r?\n\s*\r?\n/)
                    .map((paragraph) => h.p([], [paragraph])),
            ]
        ),
    }),
}

const safeUrl = (value: string, kind: "link" | "image") => {
    const normalized = value.trim()
    if (normalized.length === 0) return undefined
    if (
        normalized.startsWith("/") ||
        normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("#")
    ) {
        return normalized
    }

    try {
        const url = new URL(normalized)
        if (url.protocol === "http:" || url.protocol === "https:") {
            return normalized
        }
        if (
            kind === "link" &&
            (url.protocol === "mailto:" || url.protocol === "tel:")
        ) {
            return normalized
        }
    } catch {
        return undefined
    }

    return undefined
}

const renderMark = (
    html: Html,
    mark: RichTextMark,
    h: HtmlBuilder<Message>
): Html => {
    switch (mark.type) {
        case "bold":
            return h.strong([], [html])
        case "italic":
            return h.em([], [html])
        case "link": {
            const href = safeUrl(mark.href, "link")
            return href === undefined ? html : h.a([h.Href(href)], [html])
        }
    }
}

const renderTextNode = (
    node: RichTextTextNode,
    h: HtmlBuilder<Message>
): Html =>
    (node.marks ?? []).reduce(
        (html, mark) => renderMark(html, mark, h),
        h.span([], [node.text])
    )

const richTextApplication = {
    Flags: RichTextPage,
    init: (flags: RichTextPage) => ({
        model: flags,
        commands: [],
    }),
    view: (flags: RichTextPage, h: HtmlBuilder<Message>): Document => ({
        title: flags.page.title,
        body: h.main(
            [h.Class("site-page")],
            flags.document.children.map((block) => {
                switch (block.type) {
                    case "paragraph":
                        return h.p(
                            [],
                            block.children.map((node) =>
                                renderTextNode(node, h)
                            )
                        )
                    case "heading": {
                        const children = block.children.map((node) =>
                            renderTextNode(node, h)
                        )
                        switch (block.level) {
                            case 1:
                                return h.h1([], children)
                            case 2:
                                return h.h2([], children)
                            case 3:
                                return h.h3([], children)
                        }
                    }
                    case "blockquote":
                        return h.blockquote(
                            [],
                            block.children.map((node) =>
                                renderTextNode(node, h)
                            )
                        )
                    case "image": {
                        const src = safeUrl(block.src, "image")
                        return h.figure(
                            [],
                            [
                                h.img([
                                    ...(src === undefined ? [] : [h.Src(src)]),
                                    h.Alt(block.alt),
                                ]),
                            ]
                        )
                    }
                }
            })
        ),
    }),
}

const unsupportedContentType = (page: PublishedPageType) =>
    Effect.fail(
        new PageRenderError({
            path: page.path,
            content_type: page.content_type,
            reason: `Content type ${page.content_type} does not have a static renderer`,
        })
    )

export const renderDocumentPage = Effect.fn("DocumentPage.render")(function* (
    page: PublishedPageType,
    layout?: PublishedSiteLayout
) {
    switch (page.content_type) {
        case "markdown": {
            const document = yield* Effect.try({
                try: () => parseMarkdown(page.body),
                catch: (cause) =>
                    new PageRenderError({
                        path: page.path,
                        content_type: page.content_type,
                        reason: "Markdown parsing or validation failed",
                        cause,
                    }),
            })

            return yield* renderToString(
                {
                    ...markdown_application,
                    view: (flags: MarkdownPage, h: HtmlBuilder<Message>) => {
                        const document = markdown_application.view(flags, h)
                        return {
                            ...document,
                            body: renderSiteLayout(
                                layout,
                                page.path,
                                document.body,
                                h
                            ),
                        }
                    },
                },
                {
                    flags: { page, document },
                    isHydratable: false,
                }
            )
        }
        case "text":
            return yield* renderToString(
                {
                    ...text_application,
                    view: (
                        flags: PublishedPageType,
                        h: HtmlBuilder<Message>
                    ) => {
                        const document = text_application.view(flags, h)
                        return {
                            ...document,
                            body: renderSiteLayout(
                                layout,
                                page.path,
                                document.body,
                                h
                            ),
                        }
                    },
                },
                {
                    flags: page,
                    isHydratable: false,
                }
            )
        case "rich_text_json": {
            const decoded = yield* decodeDocumentContent({
                content_type: page.content_type,
                content: page.body,
            }).pipe(
                Effect.mapError(
                    (cause) =>
                        new PageRenderError({
                            path: page.path,
                            content_type: page.content_type,
                            reason: cause.message,
                            cause,
                        })
                )
            )

            if (decoded.content_type !== "rich_text_json") {
                return yield* Effect.fail(
                    new PageRenderError({
                        path: page.path,
                        content_type: page.content_type,
                        reason: "Decoded document did not contain rich text",
                    })
                )
            }

            return yield* renderToString(
                {
                    ...richTextApplication,
                    view: (flags: RichTextPage, h: HtmlBuilder<Message>) => {
                        const document = richTextApplication.view(flags, h)
                        return {
                            ...document,
                            body: renderSiteLayout(
                                layout,
                                page.path,
                                document.body,
                                h
                            ),
                        }
                    },
                },
                {
                    flags: { page, document: decoded.content.document },
                    isHydratable: false,
                }
            )
        }
        case "landing_json":
            return yield* renderComposedPage(page, layout)
        case "html":
        case "rtf":
            // TODO(sitegen-content-renderers): Add an explicit HTML trust
            // policy and decide whether RTF is converted or downloadable.
            return yield* unsupportedContentType(page)
    }
})

/** @deprecated Use renderDocumentPage. */
export const renderBasicPage = renderDocumentPage
