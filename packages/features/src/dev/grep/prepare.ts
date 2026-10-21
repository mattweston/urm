import {
    createHighlighterCoreSync,
    createCssVariablesTheme,
} from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import typescript from "@shikijs/langs/typescript"
import javascript from "@shikijs/langs/javascript"
import css from "@shikijs/langs/css"
import html from "@shikijs/langs/html"
import json from "@shikijs/langs/json"
import shellscript from "@shikijs/langs/shellscript"
import { parseMarkdown } from "@foldkit/markdown/vite"
import type { Block } from "@foldkit/markdown"
import { Option, Schema } from "effect"
import { grep_directives } from "./directives.ts"
import { static_mdx } from "./static-mdx.ts"
import { Preview } from "./data.ts"
import type { DocumentationSection, SourceFile } from "./data.ts"

const highlighter = createHighlighterCoreSync({
    themes: [
        createCssVariablesTheme({
            name: "grep",
            variablePrefix: "--grep-code-",
        }),
    ],
    langs: [typescript, javascript, css, html, json, shellscript],
    engine: createJavaScriptRegexEngine(),
})
const language_for = (path: string) =>
    /\.[cm]?jsx?$/.test(path)
        ? "javascript"
        : /\.tsx?$/.test(path)
          ? "typescript"
          : "text"
const language_aliases = new Map([
    ["ts", "typescript"],
    ["js", "javascript"],
    ["sh", "shellscript"],
    ["bash", "shellscript"],
    ["shell", "shellscript"],
])
const supported_language = (language: string) => {
    const name = language.trim().split(/\s+/)[0]?.toLowerCase() ?? "text"
    const canonical = language_aliases.get(name) ?? name
    return highlighter.getLoadedLanguages().includes(canonical)
        ? canonical
        : "text"
}

const static_blocks = (
    blocks: ReadonlyArray<Block>,
    section: DocumentationSection,
    files: ReadonlyArray<SourceFile>
): ReadonlyArray<Block> =>
    blocks.flatMap((block): ReadonlyArray<Block> => {
        switch (block._tag) {
            case "Island": {
                const directive = Object.entries(grep_directives).find(
                    ([name]) => name === block.name
                )
                if (directive !== undefined) {
                    if (!Schema.is(directive[1])(block.attributes))
                        throw new Error(`Invalid ${block.name} attributes`)
                    return [
                        {
                            ...block,
                            blocks: static_blocks(block.blocks, section, files),
                        },
                    ]
                }

                if (block.name === "ImportedExample") {
                    const file = files.find(
                        (candidate) => candidate.path === block.attributes.path
                    )
                    const region = block.attributes.region
                    const association = section.associations.find(
                        (candidate) =>
                            candidate.source_path === file?.path &&
                            candidate.region === region &&
                            candidate.reason ===
                                (region === undefined
                                    ? "Same source file"
                                    : "Documents this region")
                    )
                    if (file !== undefined && association !== undefined) {
                        const source = file.text
                            .split(/\r?\n/)
                            .slice(
                                association.start_line - 1,
                                association.end_line
                            )
                            .join("\n")
                        const delimiter = "`".repeat(
                            Math.max(
                                3,
                                ...Array.from(
                                    source.matchAll(/`+/g),
                                    (match) => match[0].length + 1
                                )
                            )
                        )
                        return parseMarkdown(
                            `${delimiter}typescript\n${source}\n${delimiter}`
                        ).blocks
                    }
                    return parseMarkdown(
                        "Source excerpt is unavailable in this preview."
                    ).blocks
                }
                return [
                    ...parseMarkdown(
                        `Interactive or custom example omitted from Grep: ${block.name}.`
                    ).blocks,
                    ...static_blocks(block.blocks, section, files),
                ]
            }
            case "Blockquote":
                return [
                    {
                        ...block,
                        blocks: static_blocks(block.blocks, section, files),
                    },
                ]
            case "List": {
                const [first, ...rest] = block.items
                return [
                    {
                        ...block,
                        items: [
                            {
                                ...first,
                                blocks: static_blocks(
                                    first.blocks,
                                    section,
                                    files
                                ),
                            },
                            ...rest.map((item) => ({
                                ...item,
                                blocks: static_blocks(
                                    item.blocks,
                                    section,
                                    files
                                ),
                            })),
                        ],
                    },
                ]
            }
            default:
                return [block]
        }
    })

const code_blocks = (
    blocks: ReadonlyArray<Block>
): ReadonlyArray<Extract<Block, { _tag: "CodeBlock" }>> =>
    blocks.flatMap((block) => {
        switch (block._tag) {
            case "CodeBlock":
                return [block]
            case "Island":
            case "Blockquote":
                return code_blocks(block.blocks)
            case "List":
                return block.items.flatMap((item) => code_blocks(item.blocks))
            default:
                return []
        }
    })

export const prepare_preview = (preview: Preview) => {
    const diagnostics = [...preview.diagnostics]
    const files = preview.files.map((file) => ({
        ...file,
        tokens: highlighter
            .codeToTokens(file.text, {
                lang: language_for(file.path),
                theme: "grep",
                tokenizeTimeLimit: 0,
            })
            .tokens.map((line) =>
                line.map((token) => ({
                    text: token.content,
                    color: token.color ?? "var(--grep-code-foreground)",
                }))
            ),
    }))
    const sections = preview.sections.map((section) => {
        try {
            // Grep already stores document metadata separately; render only its body.
            const body = section.text.replace(
                /^---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/,
                ""
            )
            const parsed = parseMarkdown(static_mdx(body))
            const document = {
                blocks: static_blocks(parsed.blocks, section, files),
            }
            const highlights = Object.fromEntries(
                code_blocks(document.blocks).map((block) => [
                    block.value,
                    highlighter.codeToHtml(block.value, {
                        lang: supported_language(
                            Option.getOrElse(block.maybeLanguage, () => "text")
                        ),
                        theme: "grep",
                        tokenizeTimeLimit: 0,
                    }),
                ])
            )
            return { ...section, document, highlights }
        } catch {
            diagnostics.push(
                `${section.path}: section could not be rendered; showing Markdown source.`
            )
            return section
        }
    })
    return Schema.encodeSync(Preview)({
        ...preview,
        files,
        sections,
        diagnostics,
    })
}
