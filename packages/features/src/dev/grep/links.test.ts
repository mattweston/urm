import { expect, test } from "vitest"
import { documentation_link, documentation_origin } from "./links.ts"
import { grep_request_from_url } from "./route.ts"
import { linked_documentation } from "./documentation.ts"

const target = (url: string, path: string) =>
    grep_request_from_url(documentation_link(url, path) ?? "")

test("relative documentation links retain indexed source paths and headings", () => {
    expect(
        target("#decodedocumentcontent", "docs/domain/schemas/documents.md")
    ).toMatchObject({
        doc_path: "docs/domain/schemas/documents.md",
        doc_heading: "decodedocumentcontent",
    })
    expect(
        target(
            "./indexes.md#search",
            ".context/foldkit/packages/website/src/page/database/schema.mdx"
        )
    ).toMatchObject({
        doc_path:
            ".context/foldkit/packages/website/src/page/database/indexes.md",
        doc_heading: "search",
    })
    expect(
        target(
            "/database/indexes",
            ".context/foldkit/packages/website/src/page/database/schema.mdx"
        )
    ).toMatchObject({
        doc_path: ".context/foldkit/packages/website/src/page/database/indexes",
    })
    expect(
        target("./Layer.ts", ".context/effect/packages/effect/src/Effect.ts")
    ).toMatchObject({
        doc_path: ".context/effect/packages/effect/src/Layer.ts",
    })
    expect(
        target("./sync.md", ".context/foldkit-plus/docs/remote.md")
    ).toMatchObject({
        doc_path: ".context/foldkit-plus/docs/sync.md",
    })
    expect(
        documentation_link("javascript:alert(1)", "docs/test.md")
    ).toBeUndefined()
    expect(
        documentation_link("data:text/html,test", "docs/test.md")
    ).toBeUndefined()
    expect(
        documentation_link("../../private.md", "docs/test.md")
    ).toBeUndefined()
    expect(
        documentation_link("https://example.com/guide", "docs/test.md")
    ).toBe("https://example.com/guide")
    expect(
        documentation_origin(".context/effect/packages/effect/src/Effect.ts")
    ).toBe("Effect v4 · vendored")
    expect(documentation_origin(".context/foldkit-plus/docs/remote.md")).toBe(
        "Foldkit Plus · vendored"
    )
})

test("indexed resolution supports extensionless pages and nested headings without treating code as headings", () => {
    const sections = [
        {
            id: "guide",
            path: "docs/guide.md",
            title: "Guide",
            associations: [],
            text: "## Guide\n\n```md\n### False heading\n```\n\n### Real heading\nUseful detail.\n\n### Next\nOther detail.",
        },
    ]
    expect(
        linked_documentation(sections, "docs/guide", "real-heading")[0]?.text
    ).toBe("### Real heading\nUseful detail.\n")
    expect(
        linked_documentation(sections, "docs/guide.md", "false-heading")
    ).toEqual([])
    expect(linked_documentation(sections, "docs/missing.md", "")).toEqual([])
})
