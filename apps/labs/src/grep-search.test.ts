import { extract_api_documentation } from "../grep-api-docs.server.ts"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createServer } from "vite"
import { createServer as create_http_server } from "node:http"
import { once } from "node:events"
import { grep_preview } from "../grep-preview.plugin.ts"
import { describe, expect, test } from "vitest"
import { search_corpus, load_search_corpus } from "../grep-search.server.ts"
import { Schema } from "effect"
import { SearchResponse } from "@urm/features/labs/dev/grep"
import {
    ChangedQuery,
    ReceivedSearch,
    FailedSearch,
    init,
    request_key,
    update,
} from "@urm/features/labs/dev/grep"

const preview = {
    snapshot: "fixture",
    diagnostics: [],
    sections: [],
    files: Array.from({ length: 12 }, (_, index) => ({
        path: `src/${index}.ts`,
        text: "Effect\n".repeat(45),
    })),
}
const request = {
    query: "Effect",
    selected: "",
    file_offset: 0,
    match_offsets: {},
    doc_offset: 0,
    snapshot: "",
}

describe("bounded Grep search", () => {
    test("file and occurrence pages preserve totals and line numbers", async () => {
        const signal = new AbortController().signal
        const first = await search_corpus(preview, request, signal)
        expect(first.occurrences).toBe(540)
        expect(first.files).toBe(12)
        expect(first.groups).toHaveLength(10)
        expect(first.groups.every((group) => group.shown_matches === 20)).toBe(
            true
        )
        const second = await search_corpus(
            preview,
            { ...request, file_offset: 10 },
            signal
        )
        expect(second.groups).toHaveLength(2)
        expect(second.occurrences).toBe(540)
        const occurrence_page = await search_corpus(
            preview,
            { ...request, match_offsets: { "src/0.ts": 20 } },
            signal
        )
        const group = occurrence_page.groups[0]
        expect(group?.offset).toBe(20)
        expect(group?.occurrences).toBe(45)
        expect(group?.blocks[0]?.lines[0]?.number).toBe(19)
        const ids = [
            first,
            occurrence_page,
            await search_corpus(
                preview,
                { ...request, match_offsets: { "src/0.ts": 40 } },
                signal
            ),
        ].flatMap(
            (page) =>
                page.groups[0]?.blocks.flatMap((block) =>
                    block.lines.flatMap((line) =>
                        line.matches.map((match) => match.id)
                    )
                ) ?? []
        )
        expect(new Set(ids).size).toBe(45)
        expect(
            Schema.decodeUnknownSync(SearchResponse)(
                Schema.encodeSync(SearchResponse)(first)
            )
        ).toEqual(first)
    })
    test("documentation-only results are paginated independently", async () => {
        const documents = {
            ...preview,
            files: [],
            sections: Array.from({ length: 41 }, (_, index) => ({
                id: `doc:${index}`,
                path: `docs/${index}.md`,
                title: "Guide",
                text: "A guide.",
                associations: [],
            })),
        }
        const signal = new AbortController().signal
        const first = await search_corpus(
            documents,
            { ...request, query: "Guide" },
            signal
        )
        const last = await search_corpus(
            documents,
            { ...request, query: "Guide", doc_offset: 40 },
            signal
        )
        expect(first.section_count).toBe(41)
        expect(first.sections).toHaveLength(20)
        expect(last.sections).toHaveLength(1)
        expect(last.sections[0]?.section.id).toBe("doc:40")
        expect(last.occurrences).toBe(0)
    })
    test("invalid and canceled queries fail; empty queries return no results", async () => {
        const controller = new AbortController()
        expect(
            (
                await search_corpus(
                    preview,
                    { ...request, query: "" },
                    controller.signal
                )
            ).groups
        ).toEqual([])
        await expect(
            search_corpus(
                preview,
                { ...request, query: "\n" },
                controller.signal
            )
        ).rejects.toThrow("single-line")
        controller.abort()
        await expect(
            search_corpus(preview, request, controller.signal)
        ).rejects.toThrow(/abort/i)
        const active = new AbortController()
        const pending = search_corpus(preview, request, active.signal)
        active.abort()
        await expect(pending).rejects.toThrow(/abort/i)
    })
    test("late responses and errors cannot replace a newer query", async () => {
        const old = init()
        const key = request_key(old)
        const newer = update(old, ChangedQuery({ query: "new" }))
        const response = await search_corpus(
            preview,
            request,
            new AbortController().signal
        )
        const received = update(old, ReceivedSearch({ key, response }))
        expect(received.response_key).toBe(request_key(received))
        expect(JSON.parse(request_key(received)).snapshot).toBe("fixture")
        expect(update(newer, ReceivedSearch({ key, response }))).toBe(newer)
        expect(update(newer, FailedSearch({ key, error: "old error" }))).toBe(
            newer
        )
    })
})

test("development HTTP transport enforces its request boundary and pins pagination", async () => {
    const vite = await createServer({
        configFile: false,
        envDir: false,
        logLevel: "silent",
        plugins: [grep_preview(async () => preview)],
        server: { middlewareMode: true, ws: false },
    })
    const http = create_http_server(vite.middlewares)
    try {
        http.listen(0, "127.0.0.1")
        await once(http, "listening")
        const address = http.address()
        if (address === null || typeof address === "string")
            throw new Error("Missing test address")
        const url = `http://127.0.0.1:${address.port}/__urm/grep/search`
        expect((await fetch(url)).status).toBe(405)
        expect(
            (
                await fetch(url, {
                    method: "POST",
                    body: JSON.stringify(request),
                })
            ).status
        ).toBe(403)
        const headers = {
            "Content-Type": "application/json",
            "X-URM-Grep": "1",
        }
        expect(
            (
                await fetch(url, {
                    method: "POST",
                    headers: { ...headers, Origin: "https://example.invalid" },
                    body: JSON.stringify(request),
                })
            ).status
        ).toBe(403)
        expect(
            (
                await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ ...request, file_offset: -1 }),
                })
            ).status
        ).toBe(400)
        expect(
            (
                await fetch(url, {
                    method: "POST",
                    headers,
                    body: "x".repeat(17000),
                })
            ).status
        ).toBe(413)
        expect(
            (
                await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ ...request, snapshot: "old" }),
                })
            ).status
        ).toBe(409)
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
        })
        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toBe("no-store")
        const body: unknown = await response.json()
        const decoded = Schema.decodeUnknownSync(SearchResponse)(body)
        expect(decoded.occurrences).toBe(540)
        expect(decoded.groups).toHaveLength(10)
        const suggest_url = url.replace(/search$/, "suggest")
        expect(
            (
                await fetch(suggest_url, {
                    method: "POST",
                    body: JSON.stringify({ query: "Effect" }),
                })
            ).status
        ).toBe(403)
        const suggestions = await fetch(suggest_url, {
            method: "POST",
            headers,
            body: JSON.stringify({ query: "Effect" }),
        })
        expect(suggestions.status).toBe(200)
        expect(suggestions.headers.get("cache-control")).toBe("no-store")
        expect(Object.keys(await suggestions.json())).toEqual(["suggestions"])
    } finally {
        http.closeAllConnections()
        await new Promise<void>((resolve_close, reject) =>
            http.close((error) => (error ? reject(error) : resolve_close()))
        )
        await vite.close()
    }
})

test("URM JSDoc is searchable with source associations and the URM filter", async () => {
    const path = "packages/domain/src/schemas/documents.ts"
    const corpus = await load_search_corpus(
        resolve(import.meta.dirname, "../../.."),
        ["packages/domain/src/schemas"]
    )
    const result = await search_corpus(
        corpus,
        { ...request, query: "DocumentSlug", doc_source: "urm" },
        new AbortController().signal
    )
    const section = result.sections.find(
        ({ section }) => section.title === "DocumentSlug"
    )?.section
    expect(section?.path).toBe(path)
    expect(section?.text).toContain("Uniqueness and reserved route names")
    const source = corpus.files.find((file) => file.path === path)
    const association = section?.associations[0]
    expect(association?.source_path).toBe(path)
    expect(
        source?.text.split("\n")[(association?.start_line ?? 0) - 1]
    ).toContain("export const DocumentSlug")
    expect(
        corpus.sections.some(
            (section) => section.title === "decodeDocumentContent"
        )
    ).toBe(true)

    const upstream = await search_corpus(
        corpus,
        { ...request, query: "DocumentSlug", doc_source: "effect" },
        new AbortController().signal
    )
    expect(upstream.sections).toEqual([])
})

test("vendored v4 Literals API prose ranks ahead of incidental documentation", async () => {
    const path = ".context/effect/packages/effect/src/Schema.ts"
    const file = {
        path,
        text: await readFile(
            resolve(import.meta.dirname, "../../..", path),
            "utf8"
        ),
    }
    const sections = extract_api_documentation(file)
    const result = await search_corpus(
        {
            snapshot: "api",
            files: [],
            sections: [
                ...sections,
                {
                    id: "other",
                    path: "guide.md",
                    title: "Guide",
                    text: "Literals are mentioned here.",
                    associations: [],
                },
            ],
            diagnostics: [],
        },
        { ...request, query: "Literals" },
        new AbortController().signal
    )
    expect(result.sections[0]?.section.title).toBe("Literals")
    expect(result.sections[0]?.section.path).toBe(path)
    expect(result.sections[0]?.section.text).toContain(
        "Creates a union schema from an array of literal values"
    )
    expect(result.sections[0]?.section.text).not.toContain("return make(")
    expect(result.section_count).toBeGreaterThan(1)
    expect(
        result.sections.some((item) => item.section.path === "guide.md")
    ).toBe(false)
})

test("long source lines preserve documentation, positions and occurrence pagination within the response budget", async () => {
    const query = "PhoneNumber"
    const source = "x".repeat(100_000) + (query + "y".repeat(80_000)).repeat(25)
    const corpus = {
        snapshot: "long-lines",
        diagnostics: [],
        files: [{ path: "large.ts", text: source }],
        sections: [
            {
                id: "phone",
                path: "phone.md",
                title: query,
                text: "Telephone input validation.",
                associations: [],
            },
        ],
    }
    const first = await search_corpus(
        corpus,
        { ...request, query },
        new AbortController().signal
    )
    expect(
        Buffer.byteLength(
            JSON.stringify(Schema.encodeSync(SearchResponse)(first))
        )
    ).toBeLessThan(2_000_000)
    expect(first.occurrences).toBe(25)
    expect(first.groups[0]?.shown_matches).toBe(20)
    expect(first.sections[0]?.section.document).toBeDefined()
    const matches = first.groups.flatMap((group) =>
        group.blocks.flatMap((block) =>
            block.lines.flatMap((line) => line.matches)
        )
    )
    expect(new Set(matches.map((match) => match.id)).size).toBe(20)
    for (const match of matches) {
        expect(match.text.slice(match.start, match.end)).toBe(query)
        expect(
            source.slice(match.column - 1, match.column - 1 + query.length)
        ).toBe(query)
        expect(match.line).toBe(1)
    }
    expect(first.selected?.text.length).toBeLessThan(512)
    const second = await search_corpus(
        corpus,
        { ...request, query, match_offsets: { "large.ts": 20 } },
        new AbortController().signal
    )
    expect(second.occurrences).toBe(25)
    expect(second.groups[0]?.shown_matches).toBe(5)
    expect(second.groups[0]?.offset).toBe(20)
    expect(second.selected?.id).not.toBe(first.selected?.id)
})

test("documentation source filters resolve collisions and indexed links leave code results unchanged", async () => {
    const corpus = {
        snapshot: "navigation",
        diagnostics: [],
        files: [{ path: "contact.ts", text: "Contact" }],
        sections: [
            {
                id: "urm",
                path: "docs/domain/schemas/contact.md",
                title: "Contact",
                text: "URM contact contract.",
                associations: [],
            },
            {
                id: "foldkit-plus",
                path: ".context/foldkit-plus/docs/contact.mdx",
                title: "Contact Us",
                text: "Foldkit Plus support.",
                associations: [],
            },
        ],
    }
    const signal = new AbortController().signal
    const filtered = await search_corpus(
        corpus,
        { ...request, query: "Contact", doc_source: "urm" },
        signal
    )
    expect(filtered.sections.map(({ section }) => section.id)).toEqual(["urm"])
    const linked = await search_corpus(
        corpus,
        {
            ...request,
            query: "Contact",
            doc_source: "urm",
            doc_path: ".context/foldkit-plus/docs/contact",
            doc_heading: "contact-us",
        },
        signal
    )
    expect(linked.sections.map(({ section }) => section.id)).toEqual([
        "foldkit-plus",
    ])
    expect(linked.groups).toEqual(filtered.groups)
    expect(linked.occurrences).toBe(filtered.occurrences)
    const missing = await search_corpus(
        corpus,
        { ...request, query: "Contact", doc_path: "../../not-indexed.md" },
        signal
    )
    expect(missing.sections).toEqual([])
    expect(missing.groups).toEqual(filtered.groups)
    expect(missing.diagnostics.join(" ")).toContain(
        "not in the indexed documentation"
    )
})

test("Foldkit website prose is indexed by page title and supports its UI route links", async () => {
    const root = ".context/foldkit/packages/website/src/page"
    const corpus = await load_search_corpus(
        resolve(import.meta.dirname, "../../.."),
        [root]
    )
    expect(corpus.files).toEqual([])
    const result = await search_corpus(
        corpus,
        { ...request, query: "Combobox", doc_source: "foldkit" },
        new AbortController().signal
    )
    expect(result.sections.length).toBeGreaterThan(1)
    expect(
        result.sections.every(
            ({ section }) =>
                section.path === `${root}/ui/comboboxPage.md` &&
                section.document !== undefined
        )
    ).toBe(true)
    expect(result.diagnostics).toEqual([])
    const linked = await search_corpus(
        corpus,
        {
            ...request,
            query: "Combobox",
            doc_source: "foldkit",
            doc_path: `${root}/ui/selection-submodels`,
            doc_heading: "",
        },
        new AbortController().signal
    )
    expect(linked.sections.length).toBeGreaterThan(0)
    expect(
        linked.sections.every(
            ({ section }) =>
                section.path === `${root}/ui/selectionSubmodelsPage.md`
        )
    ).toBe(true)
})

test("repository source filtering keeps documentation independent and includes Foldkit code", async () => {
    const corpus = {
        snapshot: "sources",
        diagnostics: [],
        files: [
            { path: "packages/domain/src/schema.ts", text: "Schema" },
            {
                path: ".context/foldkit/packages/ui/src/tabs.ts",
                text: "Schema",
            },
            {
                path: ".context/foldkit-plus/packages/remote/src/index.ts",
                text: "Schema",
            },
            {
                path: ".context/effect/packages/effect/src/Schema.ts",
                text: "Schema",
            },
        ],
        sections: [
            {
                id: "urm-doc",
                path: "docs/schema.md",
                title: "Schema",
                text: "URM",
                associations: [],
            },
            {
                id: "foldkit-doc",
                path: ".context/foldkit/packages/website/src/page/ui/overviewPage.md",
                title: "Schema",
                text: "Foldkit",
                associations: [],
            },
            {
                id: "foldkit-plus-doc",
                path: ".context/foldkit-plus/docs/remote.md",
                title: "Schema",
                text: "Foldkit Plus",
                associations: [],
            },
        ],
    }
    const signal = new AbortController().signal
    const foldkit = await search_corpus(
        corpus,
        { ...request, query: "Schema", repo_source: "foldkit" },
        signal
    )
    expect(foldkit.groups.map((group) => group.path)).toEqual([
        ".context/foldkit/packages/ui/src/tabs.ts",
    ])
    expect(foldkit.sections).toHaveLength(1)
    const foldkit_plus = await search_corpus(
        corpus,
        {
            ...request,
            query: "Schema",
            repo_source: "foldkit-plus",
            doc_source: "foldkit-plus",
        },
        signal
    )
    expect(foldkit_plus.groups.map((group) => group.path)).toEqual([
        ".context/foldkit-plus/packages/remote/src/index.ts",
    ])
    expect(foldkit_plus.sections.map(({ section }) => section.id)).toEqual([
        "foldkit-plus-doc",
    ])
    const urm = await search_corpus(
        corpus,
        {
            ...request,
            query: "Schema",
            repo_source: "urm",
            doc_source: "foldkit",
        },
        signal
    )
    expect(urm.groups.map((group) => group.path)).toEqual([
        "packages/domain/src/schema.ts",
    ])
    expect(urm.sections.map(({ section }) => section.id)).toEqual([
        "foldkit-doc",
    ])
})
