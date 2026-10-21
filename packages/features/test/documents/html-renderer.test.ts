import { describe, expect, it } from "vitest"
import type { RichTextDocument } from "@urm/domain/schemas/rich-text"

import {
    renderRichTextHtmlDocument,
    renderRichTextHtmlFragment,
} from "../../src/documents/html/renderer.ts"

describe("rich-text HTML renderer", () => {
    it("renders the supported document blocks and marks", () => {
        const document: RichTextDocument = {
            type: "doc",
            children: [
                {
                    type: "heading",
                    level: 1,
                    children: [{ type: "text", text: "Title" }],
                },
                {
                    type: "paragraph",
                    children: [
                        {
                            type: "text",
                            text: "Bold link",
                            marks: [
                                { type: "bold" },
                                {
                                    type: "link",
                                    href: "https://example.com/read",
                                },
                            ],
                        },
                    ],
                },
                {
                    type: "blockquote",
                    children: [{ type: "text", text: "Quoted" }],
                },
                {
                    type: "image",
                    src: "/images/example.jpg",
                    alt: "Example",
                },
            ],
        }

        expect(renderRichTextHtmlFragment(document)).toBe(
            '<h1>Title</h1>\n<p><a href="https://example.com/read" target="_blank" rel="noopener"><strong>Bold link</strong><svg class="external-link-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path><path d="m11 13 9-9"></path><path d="M15 4h5v5"></path></svg></a></p>\n<blockquote>Quoted</blockquote>\n<figure><img src="/images/example.jpg" alt="Example"></figure>'
        )
    })

    it("keeps internal and protocol links in the current browsing context", () => {
        const document: RichTextDocument = {
            type: "doc",
            children: [
                {
                    type: "paragraph",
                    children: [
                        {
                            type: "text",
                            text: "Internal",
                            marks: [{ type: "link", href: "/documents/1" }],
                        },
                        {
                            type: "text",
                            text: "Email",
                            marks: [
                                {
                                    type: "link",
                                    href: "mailto:hello@example.com",
                                },
                            ],
                        },
                    ],
                },
            ],
        }

        expect(renderRichTextHtmlFragment(document)).toBe(
            '<p><a href="/documents/1">Internal</a><a href="mailto:hello@example.com">Email</a></p>'
        )
    })

    it("escapes text, metadata, and attributes", () => {
        const document: RichTextDocument = {
            type: "doc",
            children: [
                {
                    type: "paragraph",
                    children: [
                        {
                            type: "text",
                            text: '<script>alert("text")</script>',
                        },
                    ],
                },
                {
                    type: "image",
                    src: 'https://example.com/image?name="unsafe"',
                    alt: '"><script>alert("alt")</script>',
                },
            ],
        }
        const html = renderRichTextHtmlDocument({
            title: "<Unsafe>",
            language: 'en"><script>',
            document,
        })

        expect(html).toContain("<title>&lt;Unsafe&gt;</title>")
        expect(html).toContain('lang="en&quot;&gt;&lt;script&gt;"')
        expect(html).toContain(
            "&lt;script&gt;alert(&quot;text&quot;)&lt;/script&gt;"
        )
        expect(html).not.toContain("<script>alert")
        expect(html).toContain("name=&quot;unsafe&quot;")
        expect(html).toContain(
            'alt="&quot;&gt;&lt;script&gt;alert(&quot;alt&quot;)&lt;/script&gt;"'
        )
    })

    it("removes executable URLs", () => {
        const document: RichTextDocument = {
            type: "doc",
            children: [
                {
                    type: "paragraph",
                    children: [
                        {
                            type: "text",
                            text: "Unsafe link",
                            marks: [
                                {
                                    type: "link",
                                    href: "javascript:alert(1)",
                                },
                            ],
                        },
                    ],
                },
                {
                    type: "image",
                    src: "data:text/html,<script>alert(1)</script>",
                    alt: "Unsafe image",
                },
            ],
        }
        const html = renderRichTextHtmlFragment(document)

        expect(html).toBe(
            '<p>Unsafe link</p>\n<figure><img alt="Unsafe image"></figure>'
        )
        expect(html).not.toContain("javascript:")
        expect(html).not.toContain("data:text/html")
    })
})
