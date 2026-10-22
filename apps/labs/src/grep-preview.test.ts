import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"
import { build, createServer } from "vite"
import { Preview, search_preview } from "@urm/features/labs/dev/grep"
import { Schema } from "effect"
import { collect_corpus } from "../../../packages/tools/search/corpus.ts"
import { extract_associations } from "../../../packages/tools/search/associations.ts"
import { grep_preview } from "../grep-preview.plugin.ts"
import { load_search_corpus } from "../grep-search.server.ts"
import { prepare_preview } from "@urm/features/labs/dev/grep/prepare"

const source_path = "packages/domain/src/schemas/documents.ts"
const notes_path = "example.md"

describe("Grep preview", () => {
    test("development import analysis resolves the corpus module", async () => {
        const server = await createServer({
            configFile: false,
            envDir: false,
            logLevel: "silent",
            plugins: [grep_preview()],
            server: { middlewareMode: true, ws: false },
        })
        try {
            const result = await server.transformRequest("virtual:grep-preview")
            expect(result?.code).toContain('snapshot: "remote"')
            expect(result?.code).not.toContain("DocumentContentInput")
            expect(result?.code).not.toContain(
                "packages/domain/src/schemas/media.ts"
            )
        } finally {
            await server.close()
        }
    })
    test("indexes source JSDoc without a local Markdown corpus", async () => {
        const corpus = await load_search_corpus(
            resolve(import.meta.dirname, "../../.."),
            [source_path]
        )
        expect(corpus.sections).toContainEqual(
            expect.objectContaining({
                path: source_path,
                title: "DocumentContentInput",
            })
        )
    })
    test("the source corpus produces searchable highlighted code", async () => {
        const corpus = await collect_corpus(
            resolve(import.meta.dirname, "../../.."),
            [
                "packages/domain/src",
                "packages/features/src/auth/authkit",
                "apps/urm.dev/src/auth",
            ]
        )
        expect(corpus.contents.has(source_path)).toBe(true)
        const captured = Array.from(corpus.contents, ([path, bytes]) => ({
            path,
            text: bytes.toString("utf8"),
        }))
        const preview = Schema.decodeUnknownSync(Preview)(
            prepare_preview({
                snapshot: corpus.manifest.snapshot,
                files: captured,
                sections: [],
                diagnostics: [],
            })
        )
        expect(preview.diagnostics).toEqual([])
        for (const [query, path] of [
            ["DocumentContentInput", source_path],
            [
                "AuthKitFailed",
                "packages/features/src/auth/authkit/authkit.submodel.ts",
            ],
        ]) {
            if (query === undefined || path === undefined)
                throw new Error("Missing topic fixture")
            const result = search_preview(preview, { query, selected: "" })
            expect(result.matches.some((match) => match.path === path)).toBe(
                true
            )
        }
        expect(preview.files.length).toBeGreaterThan(1)
        expect(
            search_preview(preview, { query: "Schema.Struct", selected: "" })
                .files
        ).toBeGreaterThan(1)
        for (const file of preview.files)
            expect(
                file.tokens
                    ?.map((line) => line.map((token) => token.text).join(""))
                    .join("\n")
            ).toBe(file.text)
    }, 20_000)
    test("preserves source-region associations in a fixture without surfacing unrelated prose", async () => {
        const repository = resolve(import.meta.dirname, "../../..")
        const files = [
            {
                path: source_path,
                text: await readFile(resolve(repository, source_path), "utf8"),
            },
        ]
        const extracted = extract_associations(
            notes_path,
            [
                "---",
                `source: ${source_path}`,
                "source_regions:",
                "  DocumentContentInput: document-content-input",
                "---",
                "## DocumentContentInput",
                "This schema checks document content fields.",
                "## Unrelated",
                "This section concerns something else.",
            ].join("\n"),
            files
        )
        const preview = Schema.decodeUnknownSync(Preview)({
            snapshot: "fixture",
            files,
            ...extracted,
        })
        expect(extracted.diagnostics).toEqual([])
        const prepared = Schema.decodeUnknownSync(Preview)(
            prepare_preview(preview)
        )
        expect(prepared.diagnostics).toEqual([])
        expect(
            prepared.files[0]?.tokens
                ?.map((line) => line.map((token) => token.text).join(""))
                .join("\n")
        ).toBe(files[0]?.text)
        const prepared_input = prepared.sections.find(
            (section) => section.title === "DocumentContentInput"
        )
        expect(prepared_input?.highlights).toEqual({})
        expect(JSON.stringify(prepared_input?.document)).not.toContain(
            "CodeBlock"
        )
        expect(prepared_input?.text).not.toContain(":::ImportedExample")
        expect(prepared_input?.associations).toContainEqual(
            expect.objectContaining({
                region: "document-content-input",
                reason: "Documents this region",
            })
        )
        const result = search_preview(preview, {
            query: "Schema.Struct",
            selected: "",
        })
        const declaration = result.matches.find((match) =>
            match.text.includes("export const DocumentContentInput")
        )
        expect(declaration).toBeDefined()
        const selected = search_preview(preview, {
            query: "Schema.Struct",
            selected: declaration?.id ?? "",
        })
        expect(selected.sections).toEqual([])
        const relevant = search_preview(preview, {
            query: "DocumentContentInput",
            selected: "",
        })
        expect(relevant.sections[0]?.section.title).toBe("DocumentContentInput")
        expect(relevant.sections[0]?.section.associations).toContainEqual(
            expect.objectContaining({ region: "document-content-input" })
        )
        expect(
            search_preview(preview, { query: "", selected: "" }).sections
        ).toEqual([])
        expect(
            search_preview(preview, { query: "\n", selected: "" }).matches
        ).toEqual([])
    })

    test("ignores fenced imports and resolves nested regions without broadening missing ones", () => {
        const file = {
            path: "src/example.ts",
            text: "// #region outer\nfirst\n// #region inner\nsecond\n// #endregion inner\nthird\n// #endregion outer",
        }
        const markdown = [
            "## Example",
            "```md",
            ':::ImportedExample{path="src/example.ts" region="missing"}',
            "```",
            ':::ImportedExample{path="src/example.ts" region="outer"}',
            ":::",
            "## Missing",
            ':::ImportedExample{path="src/example.ts" region="missing"}',
            ":::",
        ].join("\n")
        const result = extract_associations("guide.md", markdown, [file])
        expect(result.sections[0]?.associations).toEqual([
            {
                source_path: file.path,
                start_line: 2,
                end_line: 6,
                reason: "Documents this region",
                region: "outer",
            },
        ])
        expect(result.sections[1]?.associations).toEqual([])
        expect(result.diagnostics).toHaveLength(1)
    })

    test("region metadata diagnoses missing regions and headings without claiming exact links", () => {
        const result = extract_associations(
            "guide.md",
            [
                "---",
                "source: src/example.ts",
                "source_regions:",
                "  Explanation: missing",
                "  Typo: outer",
                "---",
                "## Explanation",
                "Prose only.",
            ].join("\n"),
            [
                {
                    path: "src/example.ts",
                    text: "// #region outer\ncode\n// #endregion outer",
                },
            ]
        )
        expect(result.diagnostics).toHaveLength(2)
        expect(
            result.sections[0]?.associations.every(
                (association) => association.reason === "Same source file"
            )
        ).toBe(true)
        expect(result.sections[0]?.text).toBe("## Explanation\nProse only.")
    })

    test.each([
        "aliases: [DocumentContentInput, document_content]",
        "aliases:\n  - DocumentContentInput\n  - document_content",
    ])("documentation metadata is searchable independently: %s", (aliases) => {
        const files = [{ path: source_path, text: "Literals" }]
        const incidental = extract_associations(
            "docs/documents.md",
            `---\nsource: ${source_path}\n---\n# Documents\nLiterals are mentioned here.`,
            files
        )
        const dedicated = extract_associations(
            "docs/literals.md",
            "---\ntitle: Literal values\n---\n# Constants\nDefine the accepted values.",
            files
        )
        const aliased = extract_associations(
            "docs/content.md",
            `---\ntitle: Document content\n${aliases}\n---\n# Content\nValidate the outer fields.`,
            files
        )
        const preview = Schema.decodeUnknownSync(Preview)({
            snapshot: "metadata",
            files,
            sections: [
                ...incidental.sections,
                ...dedicated.sections,
                ...aliased.sections,
            ],
            diagnostics: [],
        })
        for (const query of ["Literals", "literals"]) {
            const result = search_preview(preview, { query, selected: "" })
            expect(result.sections[0]?.section.path).toBe("docs/literals.md")
            expect(result.sections[0]?.reason).toBe("Exact filename match")
        }
        const alias_result = search_preview(preview, {
            query: "documentcontentinput",
            selected: "",
        })
        expect(alias_result.occurrences).toBe(0)
        expect(alias_result.sections[0]?.reason).toBe("Exact alias match")
        expect(alias_result.sections[0]?.section.path).toBe("docs/content.md")
        expect(
            search_preview(preview, { query: "LITERAL VALUES", selected: "" })
                .sections[0]?.reason
        ).toBe("Exact page title match")
        expect(
            search_preview(preview, { query: "", selected: "" }).sections
        ).toEqual([])
    })

    test("MDX prose renders around static screenshots", () => {
        const path = ".context/foldkit-plus/docs/example.mdx"
        const extracted = extract_associations(
            path,
            '# Schema\n\n<Screenshot alt="The database schema page" />\n\nThe page shows relationships between tables.',
            []
        )
        const preview = Schema.decodeUnknownSync(Preview)(
            prepare_preview({ snapshot: "screenshot", files: [], ...extracted })
        )
        expect(preview.diagnostics).toEqual([])
        expect(
            preview.sections.every((section) => section.document !== undefined)
        ).toBe(true)
        const document = JSON.stringify(
            preview.sections.map((section) => section.document)
        )
        expect(document).toContain("The database schema page")
        expect(document).toContain("image omitted")
        expect(document).toContain("relationships between tables")
        expect(document).not.toContain("<Screenshot")
    })

    test("production output excludes the local corpus", async () => {
        const result = await build({
            configFile: false,
            envDir: false,
            logLevel: "silent",
            plugins: [grep_preview()],
            build: {
                write: false,
                minify: false,
                rollupOptions: {
                    input: "virtual:grep-preview",
                    preserveEntrySignatures: "strict",
                },
            },
        })
        const outputs = Array.isArray(result)
            ? result
            : "output" in result
              ? [result]
              : []
        const code = outputs
            .flatMap((output) =>
                output.output.flatMap((item) =>
                    item.type === "chunk" ? [item.code] : []
                )
            )
            .join("\n")
        expect(code).toContain("unavailable")
        expect(code).not.toContain(source_path)
        expect(code).not.toContain("DocumentContentInput")
    })
})
