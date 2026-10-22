import { bounded_excerpts } from "./grep-excerpts.server.ts"
import { extract_api_documentation } from "./grep-api-docs.server.ts"
import { setImmediate } from "node:timers/promises"
import { Schema } from "effect"
import {
    Preview,
    SearchResponse,
    rank_documentation,
    linked_documentation,
    documentation_source,
} from "@urm/features/labs/dev/grep"
import type { SearchRequest } from "@urm/features/labs/dev/grep"
import type { CodeMatch } from "@urm/features/labs/dev/grep"
import { group_context } from "@urm/features/labs/dev/grep"
import { prepare_preview } from "@urm/features/labs/dev/grep/prepare"
import { collect_corpus } from "../../packages/tools/search/corpus.ts"
import { extract_associations } from "../../packages/tools/search/associations.ts"

const urm_source_roots = [
    "packages/auth/src",
    "packages/contracts/src",
    "packages/database/src",
    "packages/domain/src",
    "packages/features/src",
    "packages/rpc/src",
    "apps/labs/src",
    "apps/urm.dev/src",
    "apps/server/src",
]
const foldkit_plus_package_roots = [
    "agent",
    "agent-a2a",
    "agent-mcp",
    "agent-native",
    "agent-webmcp",
    "durable",
    "mirror",
    "mixins",
    "mixins-surface",
    "mixins-ui",
    "remote",
    "remote-drizzle",
    "remote-server",
    "surface",
    "sync",
].map((name) => `.context/foldkit-plus/packages/${name}/src`)
const documentation_roots = [
    ".context/effect/ai-docs/src",
    ".context/foldkit/packages/website/src/page",
    ".context/foldkit-plus/docs",
]
export const search_roots = [
    ...urm_source_roots,
    ".context/effect/packages/effect/src",
    ".context/foldkit/packages/foldkit/src",
    ".context/foldkit/packages/ui/src",
    ".context/foldkit/packages/markdown/src",
    ...foldkit_plus_package_roots,
    ...documentation_roots,
]
const origin_for = (path: string) =>
    path.startsWith(".context/foldkit-plus/")
        ? "Foldkit Plus (vendored)"
        : path.startsWith(".context/foldkit/")
          ? "Foldkit (vendored)"
          : path.startsWith(".context/effect/")
            ? "Effect (vendored v4)"
            : "URM"

export const load_search_corpus = async (
    repository: string,
    roots = search_roots
) => {
    const corpus = await collect_corpus(repository, roots)
    const files: Preview["files"][number][] = []
    const documents: { path: string; text: string }[] = []
    for (const [path, bytes] of corpus.contents) {
        const file = { path, text: bytes.toString("utf8") }
        if (/\.mdx?$/.test(path)) {
            if (documentation_roots.some((root) => path.startsWith(`${root}/`)))
                documents.push(file)
        } else if (
            !file.path.startsWith(".context/foldkit/packages/website/src/page/")
        )
            files.push(file)
    }
    const extracted = documents.map((document) => {
        const extracted = extract_associations(
            document.path,
            document.text,
            files
        )
        const foldkit_title = document.path.startsWith(".context/foldkit/")
            ? /^#\s+(.+)$/m.exec(document.text)?.[1]
            : undefined
        return foldkit_title === undefined
            ? extracted
            : {
                  ...extracted,
                  sections: extracted.sections.map((section) => ({
                      ...section,
                      page_title: foldkit_title,
                  })),
              }
    })
    return {
        snapshot: corpus.manifest.snapshot,
        files,
        sections: [
            ...files
                .filter(
                    (file) =>
                        file.path.endsWith(".ts") &&
                        !file.path.includes("/internal/") &&
                        (urm_source_roots.some((root) =>
                            file.path.startsWith(`${root}/`)
                        ) ||
                            file.path.startsWith(
                                ".context/effect/packages/effect/src/"
                            ))
                )
                .flatMap(extract_api_documentation),
            ...extracted.flatMap((item) => item.sections),
        ],
        diagnostics: extracted.flatMap((item) => item.diagnostics),
    }
}

export const search_corpus = async (
    preview: Preview,
    request: SearchRequest,
    signal: AbortSignal
): Promise<SearchResponse> => {
    if (
        /[\r\n]/.test(request.query) ||
        request.query.includes("\0") ||
        Array.from(request.query).length > 1024 ||
        /[\uD800-\uDFFF]/u.test(request.query)
    )
        throw new Error("Enter a single-line query of up to 1,024 characters.")
    if (Object.keys(request.match_offsets).length > 100)
        throw new Error("Too many occurrence offsets; restart the search.")
    signal.throwIfAborted()
    let occurrences = 0
    const file_counts = new Map<string, number>()
    const matches: CodeMatch[] = []
    const page_files: Preview["files"][number][] = []
    const source_for = (path: string) =>
        path.startsWith(".context/effect/")
            ? "effect"
            : path.startsWith(".context/foldkit-plus/")
              ? "foldkit-plus"
              : path.startsWith(".context/foldkit/")
                ? "foldkit"
                : "urm"
    if (request.query !== "") {
        for (const file of preview.files.filter(
            (file) =>
                request.repo_source === undefined ||
                request.repo_source === "all" ||
                source_for(file.path) === request.repo_source
        )) {
            await setImmediate(undefined, { signal })
            const file_number = file_counts.size
            const in_page =
                file_number >= request.file_offset &&
                file_number < request.file_offset + 10
            const offset = request.match_offsets[file.path] ?? 0
            let count = 0
            const lines = file.text.split(/\r?\n/)
            for (let index = 0; index < lines.length; index++) {
                if (index % 256 === 0) await setImmediate(undefined, { signal })
                const text = lines[index] ?? ""
                for (
                    let start = text.indexOf(request.query);
                    start !== -1;
                    start = text.indexOf(
                        request.query,
                        start + request.query.length
                    )
                ) {
                    count++
                    if (count % 4096 === 0)
                        await setImmediate(undefined, { signal })
                    if (in_page && count > offset && count <= offset + 20)
                        matches.push({
                            id: `${file.path}:${index + 1}:${start}`,
                            path: file.path,
                            line: index + 1,
                            column: start + 1,
                            text,
                            start,
                            end: start + request.query.length,
                        })
                }
            }
            if (count > 0) {
                file_counts.set(file.path, count)
                occurrences += count
                if (in_page) page_files.push(file)
            }
        }
    }
    const selected =
        matches.find((match) => match.id === request.selected) ?? matches[0]
    const doc_path = request.doc_path ?? ""
    const ranked =
        doc_path !== ""
            ? linked_documentation(
                  preview.sections,
                  doc_path,
                  request.doc_heading ?? ""
              ).map((section) => ({
                  section,
                  reason: "Linked documentation",
                  rank: 0,
              }))
            : request.query === ""
              ? []
              : rank_documentation(
                    preview.sections.filter(
                        (section) =>
                            !request.doc_source ||
                            request.doc_source === "all" ||
                            documentation_source(section.path) ===
                                request.doc_source
                    ),
                    request.query,
                    selected
                )
    const section_page = ranked.slice(
        request.doc_offset,
        request.doc_offset + 20
    )
    signal.throwIfAborted()
    if (
        section_page.reduce(
            (bytes, item) => bytes + item.section.text.length,
            0
        ) > 1_000_000
    )
        throw new Error(
            "These documentation sections exceed the response limit. Refine the query."
        )
    const prepared = Schema.decodeUnknownSync(Preview)(
        prepare_preview({
            ...preview,
            files: page_files.filter((file) => file.text.length <= 512_000),
            sections: section_page.map((item) => item.section),
            diagnostics: [],
        })
    )
    await setImmediate(undefined, { signal })
    const grouped = group_context(
        {
            ...preview,
            files: page_files.map(
                (file) =>
                    prepared.files.find((item) => item.path === file.path) ??
                    file
            ),
        },
        {
            error: "",
            matches,
            occurrences,
            files: file_counts.size,
            shown_files: page_files.length,
            file_counts,
            selected,
            sections: ranked,
        }
    )
    const groups = bounded_excerpts(
        grouped.map((group) => ({
            ...group,
            origin: origin_for(group.path),
            offset: request.match_offsets[group.path] ?? 0,
        }))
    )
    const displayed_selected = groups
        .flatMap((group) =>
            group.blocks.flatMap((block) =>
                block.lines.flatMap((line) => line.matches)
            )
        )
        .find((match) => match.id === selected?.id)
    const clipped = grouped.some((group) =>
        group.blocks.some((block) =>
            block.lines.some((line) => line.text.length > 512)
        )
    )
    return {
        snapshot: preview.snapshot,
        occurrences,
        files: file_counts.size,
        file_offset: request.file_offset,
        doc_offset: request.doc_offset,
        section_count: ranked.length,
        ...(displayed_selected === undefined
            ? {}
            : { selected: displayed_selected }),
        groups,
        sections: section_page.map((item, index) => ({
            ...item,
            section: prepared.sections[index] ?? item.section,
        })),
        diagnostics: [
            ...(doc_path !== "" && ranked.length === 0
                ? [
                      "This page or heading is not in the indexed documentation. Return to search or choose another documentation link.",
                  ]
                : []),
            ...(clipped
                ? [
                      "Long source lines are excerpted around each match; ellipses mark omitted text. Line numbers, columns and occurrence counts refer to the original source. Syntax colors are omitted on excerpted lines.",
                  ]
                : []),
            ...page_files
                .filter((file) => file.text.length > 512_000)
                .map(
                    (file) =>
                        `${file.path}: syntax colors omitted for this large file; occurrence counts remain complete.`
                ),
            ...prepared.diagnostics,
            ...preview.diagnostics.slice(0, 10),
            ...(preview.diagnostics.length > 10
                ? [
                      `${preview.diagnostics.length - 10} further corpus diagnostics.`,
                  ]
                : []),
        ],
        origins: [...new Set(search_roots.map(origin_for))],
    }
}
