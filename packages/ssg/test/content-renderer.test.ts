import { Cause, Effect, Option } from "effect"
import { describe, expect, it } from "vitest"

import {
    PageRenderError,
    renderDocumentPage,
    type PublishedPageType,
} from "../src/index.ts"

const page = (
    content_type: PublishedPageType["content_type"],
    body: string
): PublishedPageType => ({
    path: "/guide/",
    title: "Guide",
    heading: "Guide",
    body,
    content_type,
})

const render = (
    content_type: PublishedPageType["content_type"],
    body: string
) => Effect.runPromise(renderDocumentPage(page(content_type, body)))

const unsupported_content_types: ReadonlyArray<
    PublishedPageType["content_type"]
> = ["html", "rtf"]

const renderFailure = async (
    content_type: PublishedPageType["content_type"],
    body: string
) => {
    const exit = await Effect.runPromiseExit(
        renderDocumentPage(page(content_type, body))
    )
    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Success") {
        throw new Error("Expected document rendering to fail")
    }
    return Option.getOrThrow(Cause.findErrorOption(exit.cause))
}

describe("renderDocumentPage", () => {
    it("renders validated Markdown into semantic static HTML", async () => {
        const result = await render(
            "markdown",
            "## Introduction\n\nA [safe link](https://example.com).\n\n```ts\nconst answer = 42\n```"
        )

        expect(result.html).toContain("<h2>Introduction</h2>")
        expect(result.html).toContain('href="https://example.com"')
        expect(result.html).toContain("<pre")
        expect(result.html).toContain("const answer = 42")
        expect(result.html).not.toContain("<script")
        expect(result.html).not.toContain("data-foldkit")
    })

    it("escapes plain text and preserves paragraph boundaries", async () => {
        const result = await render(
            "text",
            "First <script>alert(1)</script>\n\nSecond paragraph"
        )

        expect(result.html).toContain(
            "First &lt;script&gt;alert(1)&lt;/script&gt;"
        )
        expect(result.html).toContain("<p>Second paragraph</p>")
        expect(result.html).not.toContain("<script")
    })

    it("rejects raw HTML in Markdown", async () => {
        const failure = await renderFailure("markdown", "<script>x()</script>")

        expect(failure).toBeInstanceOf(PageRenderError)
    })

    it("rejects executable Markdown URLs", async () => {
        const failure = await renderFailure(
            "markdown",
            "[unsafe](javascript:alert(1))"
        )

        expect(failure).toBeInstanceOf(PageRenderError)
    })

    it("renders validated rich text and drops unsafe URLs", async () => {
        const result = await render(
            "rich_text_json",
            JSON.stringify({
                schema_version: 1,
                document: {
                    type: "doc",
                    children: [
                        {
                            type: "paragraph",
                            children: [
                                {
                                    type: "text",
                                    text: "Safe text",
                                    marks: [
                                        { type: "bold" },
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
                            src: "javascript:alert(1)",
                            alt: "Unsafe source omitted",
                        },
                    ],
                },
            })
        )

        expect(result.html).toContain("<strong><span>Safe text</span></strong>")
        expect(result.html).toContain('alt="Unsafe source omitted"')
        expect(result.html).not.toContain("javascript:")
        expect(result.html).not.toContain("<script")
    })

    it("rejects invalid rich-text JSON with a typed route error", async () => {
        const failure = await renderFailure("rich_text_json", "not-json")

        expect(failure).toBeInstanceOf(PageRenderError)
    })

    it("renders versioned page blocks with safe actions and images", async () => {
        const result = await render(
            "landing_json",
            JSON.stringify({
                schema_version: 1,
                motion: "rise",
                blocks: [
                    {
                        _tag: "Hero",
                        id: "hero",
                        heading: "Build something useful",
                        body: "A concise explanation.",
                        actions: [
                            {
                                label: "Start",
                                href: "/contact/",
                                style: "primary",
                            },
                            {
                                label: "Unsafe",
                                href: "javascript:alert(1)",
                                style: "link",
                            },
                        ],
                        image: {
                            _tag: "ResolvedImage",
                            src: "https://cdn.example.com/hero.jpg",
                            alt: "People working together",
                            width: 1200,
                            height: 800,
                        },
                    },
                    {
                        _tag: "Faq",
                        id: "faq",
                        heading: "Questions",
                        items: [
                            { question: "Why?", answer: "Because it helps." },
                        ],
                    },
                ],
            })
        )

        expect(result.html).toContain("<h1>Build something useful</h1>")
        expect(result.html).toContain('href="/contact/"')
        expect(result.html).toContain('src="https://cdn.example.com/hero.jpg"')
        expect(result.html).toContain('width="1200"')
        expect(result.html).toContain("<details")
        expect(result.html).toContain('data-landing-motion="rise"')
        expect(result.html).toContain("data-landing-reveal")
        expect(result.html).not.toContain("javascript:")
    })

    it.each(unsupported_content_types)(
        "fails explicitly when %s has no static renderer",
        async (content_type) => {
            const failure = await renderFailure(content_type, "content")

            expect(failure).toBeInstanceOf(PageRenderError)
        }
    )
})
