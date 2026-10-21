import { describe, expect, test, vi } from "vitest"
import { Schema } from "effect"
import { Preview } from "./data.ts"
import { static_mdx } from "./static-mdx.ts"
import { prepare_preview } from "./prepare.ts"

describe("Static Grep Markdown", () => {
    test("finishes source and fence highlighting despite elapsed wall time", () => {
        let now = 0
        const clock = vi.spyOn(Date, "now").mockImplementation(() => {
            now += 1_000
            return now
        })
        try {
            const source = 'const status = "active"'
            const preview = Schema.decodeUnknownSync(Preview)(
                prepare_preview({
                    snapshot: "slow-tokenization",
                    files: [{ path: "example.ts", text: source }],
                    diagnostics: [],
                    sections: [
                        {
                            id: "fence",
                            path: "guide.md",
                            title: "Usage",
                            associations: [],
                            text: `\`\`\`ts\n${source}\n\`\`\``,
                        },
                    ],
                })
            )
            expect(preview.diagnostics).toEqual([])
            const highlighted = Object.values(
                preview.sections[0]?.highlights ?? {}
            ).join("")
            expect(highlighted).toContain("--grep-code-token-keyword")
            expect(highlighted).toContain("--grep-code-token-string")
            const tokens = preview.files[0]?.tokens?.flat() ?? []
            expect(tokens.map((token) => token.text).join("")).toBe(source)
            expect(
                tokens.some((token) =>
                    token.color.includes("--grep-code-token-string")
                )
            ).toBe(true)
        } finally {
            clock.mockRestore()
        }
    })
    test.each(["ts", "typescript", "ts title=example.ts", "js", "javascript"])(
        "highlights documentation fences labeled %s",
        (language) => {
            const preview = Schema.decodeUnknownSync(Preview)(
                prepare_preview({
                    snapshot: "test",
                    files: [],
                    diagnostics: [],
                    sections: [
                        {
                            id: "fence",
                            path: "guide.md",
                            title: "Usage",
                            associations: [],
                            text: `\`\`\`${language}\nconst status = "active"\n\`\`\``,
                        },
                    ],
                })
            )
            expect(preview.diagnostics).toEqual([])
            const highlighted = Object.values(
                preview.sections[0]?.highlights ?? {}
            ).join("")
            expect(highlighted).toContain("--grep-code-token-keyword")
            expect(highlighted).toContain("--grep-code-token-string")
        }
    )
    test("keeps prose and code while removing interactive islands and escaping code HTML", () => {
        const text = [
            "## Explanation",
            "",
            ":::StyleguideAnimation",
            "Readable **guidance**.",
            "",
            "```typescript",
            'const example = "<script>alert(1)</script>"',
            "```",
            ":::",
        ].join("\n")
        const preview = Schema.decodeUnknownSync(Preview)(
            prepare_preview({
                snapshot: "test",
                files: [],
                diagnostics: [],
                sections: [
                    {
                        id: "test",
                        path: "guide.md",
                        title: "Example",
                        text,
                        associations: [],
                    },
                ],
            })
        )
        const section = preview.sections[0]
        expect(preview.diagnostics).toEqual([])
        expect(JSON.stringify(section?.document)).not.toContain(
            '"_tag":"Island"'
        )
        expect(JSON.stringify(section?.document)).toContain("guidance")
        expect(JSON.stringify(section?.document)).toContain("omitted from Grep")
        const highlighted = Object.values(section?.highlights ?? {}).join("")
        expect(highlighted).toMatch(/(?:&lt;|&#x3C;)script/)
        expect(highlighted).not.toContain("<script>")
    })

    test("static screenshot conversion preserves examples and refuses dynamic attributes", () => {
        const example = '```mdx\n<Screenshot alt="Example" />\n```'
        expect(static_mdx(example)).toBe(example)
        const dynamic = "<Screenshot alt={runCode()} />"
        expect(static_mdx(dynamic)).toBe(dynamic)
        expect(
            static_mdx('<Screenshot alt="<script>danger</script>" />')
        ).not.toContain("<script>")
    })

    test("preserves escaped source when Markdown cannot be rendered", () => {
        const text = "<script>window.unwanted = true</script>"
        const preview = Schema.decodeUnknownSync(Preview)(
            prepare_preview({
                snapshot: "test",
                files: [],
                diagnostics: [],
                sections: [
                    {
                        id: "test",
                        path: "guide.md",
                        title: "Example",
                        text,
                        associations: [],
                    },
                ],
            })
        )
        expect(preview.sections[0]?.text).toBe(text)
        expect(preview.sections[0]?.document).toBeUndefined()
        expect(preview.diagnostics).toHaveLength(1)
    })
})

test("registered Markdown containers preserve nested code and reject invalid attributes", () => {
    const prepare = (text: string) =>
        Schema.decodeUnknownSync(Preview)(
            prepare_preview({
                snapshot: "directives",
                files: [],
                diagnostics: [],
                sections: [
                    {
                        id: "containers",
                        path: "containers.md",
                        title: "Containers",
                        associations: [],
                        text,
                    },
                ],
            })
        )
    const result = prepare(
        [
            ':::Callout{tone="Note"}',
            "Guidance.",
            ":::",
            "",
            ":::Steps",
            "1. Validate input.",
            "2. Decode content.",
            ":::",
            "",
            '::::Tabs{labels="Text,JSON"}',
            ":::TabItem",
            "```ts",
            'const value = "text"',
            "```",
            ":::",
            ":::TabItem",
            "JSON guidance.",
            ":::",
            "::::",
        ].join("\n\n")
    )
    expect(result.diagnostics).toEqual([])
    const document = JSON.stringify(result.sections[0]?.document)
    for (const name of ["Callout", "Steps", "Tabs", "TabItem"])
        expect(document).toContain(`"name":"${name}"`)
    expect(
        Object.values(result.sections[0]?.highlights ?? {}).join("")
    ).toContain("--grep-code-token-keyword")
    const invalid = prepare(':::Callout{tone="Unknown"}\nGuidance.\n:::')
    expect(invalid.diagnostics).toHaveLength(1)
    expect(invalid.sections[0]?.document).toBeUndefined()
})
