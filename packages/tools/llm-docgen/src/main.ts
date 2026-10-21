#!/usr/bin/env node
/**
 * @since 1.0.0
 *
 * URM LLM Documentation Generator
 *
 * Generates LLMS.md from the llm-docs/ corpus of markdown and TypeScript examples.
 * Based on effect-smol's ai-docgen but adapted for URM's Effect version.
 *
 * See main-orig.ts.md for the original effect-smol implementation.
 */
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
// 'Array' is declared but its value is never read.
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"
import * as String from "effect/String"

// Parse command line arguments (manual parsing instead of unstable/cli)
const args = process.argv.slice(2)
const directory = args[0] || "llm-docs/src"
const outputIndex = args.indexOf("-o")
const output = outputIndex >= 0 ? args[outputIndex + 1] : "LLMS.md"
const watch = args.includes("--watch") || args.includes("-w")
const check = args.includes("--check")

if (!directory || !output) {
    console.error(
        "Usage: urm-llm-docgen [directory] -o <output> [--watch] [--check]"
    )
    process.exit(1)
}

// Main program
const program = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const absDirectory = path.resolve(directory)
    const absOutput = path.resolve(output)

    const { markdown } = yield* directoryToMarkdown(absDirectory)

    // The budget linter measures the committed LLMS.md, so a stale one can pass
    // a check the real output would fail. `--check` closes that gap: it proves
    // the committed file is what `llm-docs/` currently generates, without writing.
    if (check) {
        const committed: string | null = yield* fs
            .readFileString(absOutput)
            .pipe(Effect.orElseSucceed(() => null))

        if (committed === markdown) {
            yield* Effect.logInfo(`${absOutput} is up to date.`)
            return
        }

        yield* Effect.logError(
            committed === null
                ? `${absOutput} is missing — run pnpm docgen:llm`
                : `${absOutput} is stale — run pnpm docgen:llm and commit the result`
        )
        process.exitCode = 1
        return
    }

    yield* fs.writeFileString(absOutput, markdown)
    yield* Effect.logInfo(`Generated ${absOutput}`)

    if (!watch) return

    yield* Effect.logInfo("Watching for changes...")

    yield* fs.watch(absDirectory).pipe(
        Stream.debounce(1000),
        Stream.tap(() => Effect.logInfo("Changes detected, regenerating...")),
        Stream.switchMap(() =>
            Stream.fromEffect(directoryToMarkdown(absDirectory))
        ),
        Stream.runForEach((updated) =>
            Effect.gen(function* () {
                yield* fs.writeFileString(absOutput, updated.markdown)
                yield* Effect.logInfo("Documentation updated.")
            })
        )
    )
})

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const orderPattern = /^order:\s*(\d+)\s*$/m
const titlePattern = /^title:\s*(.+?)\s*$/m

/**
 * Section intros are Astro content entries, so they carry YAML frontmatter.
 * That is metadata for the site, not documentation — strip it from the
 * generated output, and reuse its `order` to sequence sections now that the
 * folder-name numeric prefixes are gone.
 */
const parseFrontmatter = (
    raw: string
): {
    readonly body: string
    readonly order: number | undefined
    readonly title: string | undefined
} => {
    const match = frontmatterPattern.exec(raw)
    if (match === null) return { body: raw, order: undefined, title: undefined }

    const block = match[1] ?? ""
    const orderMatch = orderPattern.exec(block)
    const titleMatch = titlePattern.exec(block)

    return {
        body: raw.slice(match[0].length).trim(),
        order: orderMatch === null ? undefined : Number(orderMatch[1]),
        title:
            titleMatch === null
                ? undefined
                : (titleMatch[1] ?? "").replace(/^["']|["']$/g, "").trim(),
    }
}

/**
 * Each index.md is authored as a standalone page, so it opens with an `# H1`.
 * Nested inside the generated document that H1 is a subsection, so push every
 * heading down by the directory's depth. The result has one H1 — the corpus
 * itself — with each section an H2, matching `.context/effect-smol/LLMS.md`.
 *
 * Headings inside fenced blocks are code, not structure; leave them alone.
 */
const shiftHeadings = (content: string, levels: number): string => {
    if (levels <= 0) return content

    let insideFence = false

    return content
        .split("\n")
        .map((line) => {
            if (line.startsWith("```")) {
                insideFence = !insideFence
                return line
            }
            if (insideFence) return line

            const match = /^(#{1,6})\s/.exec(line)
            if (match === null) return line

            const hashes = match[1] ?? ""
            return `${headingPrefix(hashes.length + levels)}${line.slice(hashes.length)}`
        })
        .join("\n")
}

/** Markdown stops at H6, so deeply nested sections flatten rather than break. */
const headingPrefix = (level: number): string =>
    "#".repeat(Math.min(6, Math.max(1, level)))

/**
 * Converting a section intro to an Astro entry moves its `# Heading` into the
 * frontmatter `title`. Put it back, unless the body still carries its own
 * heading, so the generated document keeps one heading per section either way.
 */
const withHeading = (
    body: string,
    title: string | undefined,
    level: number
): string => {
    const prefix = headingPrefix(level)
    return title === undefined || body.startsWith(`${prefix} `)
        ? body
        : `${prefix} ${title}\n\n${body}`
}

/** Obsidian wikilinks are navigation metadata, not AI documentation. */
const withoutIndexPresentation = (content: string): string =>
    content
        .split("\n")
        .filter((line) => !line.includes("[[") || !line.includes("]]"))
        .join("\n")

// Convert directory contents to markdown
type FileMetadata = {
    readonly title: string
    readonly description: string | undefined
    readonly content: string
    readonly fileNameWithoutExt: string
    /** `@inline` in the file's doc block, or a legacy `0` filename prefix. */
    readonly inline: boolean
}

type DirectoryMarkdown = {
    readonly markdown: string
    /** `order` from this directory's own index.md, used to sequence sections. */
    readonly order: number | undefined
}

const directoryToMarkdown = (
    sourceDirectory: string,
    /** 0 for the corpus root; each nested directory is one heading level down. */
    depth = 0
): Effect.Effect<
    DirectoryMarkdown,
    unknown,
    FileSystem.FileSystem | Path.Path
> =>
    Effect.gen(function* () {
        const pathService = yield* Path.Path
        const fs = yield* FileSystem.FileSystem

        const rawIndexMd: string | null = yield* fs
            .readFileString(pathService.join(sourceDirectory, "index.md"))
            .pipe(Effect.orElseSucceed(() => null))

        const indexFrontmatter =
            rawIndexMd === null
                ? { body: null, order: undefined, title: undefined }
                : parseFrontmatter(rawIndexMd)

        // A section's own heading sits one level below its parent's; its
        // examples sit one below that.
        const sectionLevel = depth + 1
        const exampleHeading = headingPrefix(sectionLevel + 1)

        const indexMd: string | null =
            indexFrontmatter.body === null
                ? null
                : String.trim(
                      withHeading(
                          shiftHeadings(
                              String.trim(
                                  withoutIndexPresentation(
                                      indexFrontmatter.body
                                  )
                              ),
                              depth
                          ),
                          indexFrontmatter.title,
                          sectionLevel
                      )
                  )

        // readDirectory order is filesystem-dependent; sort so the generated
        // document is stable across machines and after renames.
        const allFiles: ReadonlyArray<string> = (yield* fs.readDirectory(
            sourceDirectory
        )).toSorted((left, right) => left.localeCompare(right))
        const hasInlineFiles = allFiles.some((file) => {
            const basename = pathService.basename(file)
            return basename.startsWith("0") && /\.tsx?$/.test(basename)
        })

        type Entry = {
            readonly order: number
            readonly name: string
            readonly content: string | null
        }

        const fileContents: ReadonlyArray<Entry> = yield* Effect.forEach(
            allFiles,
            (
                file
            ): Effect.Effect<
                Entry,
                unknown,
                FileSystem.FileSystem | Path.Path
            > =>
                Effect.gen(function* () {
                    const filePath = pathService.join(sourceDirectory, file)
                    const stat = yield* fs.stat(filePath)
                    const basename = pathService.basename(filePath)
                    const unordered = Number.MAX_SAFE_INTEGER

                    if (stat.type === "Directory") {
                        if (
                            basename === "fixtures" ||
                            basename === "node_modules" ||
                            basename.startsWith(".") ||
                            basename.startsWith("_")
                        )
                            return {
                                order: unordered,
                                name: file,
                                content: null,
                            }
                        const subdir: DirectoryMarkdown =
                            yield* directoryToMarkdown(filePath, depth + 1)
                        return {
                            order: subdir.order ?? unordered,
                            name: file,
                            content: `${subdir.markdown}\n`,
                        }
                    } else if (/\.tsx?$/.test(file)) {
                        const metadata: FileMetadata =
                            yield* tsFileMetadata(filePath)

                        if (metadata.inline) {
                            // Leading newline guarantees a blank line before the
                            // heading even when a link entry precedes it.
                            return {
                                order: unordered,
                                name: file,
                                content: `
${exampleHeading} ${metadata.title}

${metadata.description ?? ""}

\`\`\`ts
${metadata.content}
\`\`\`
`,
                            }
                        }

                        const relativePath = pathService.relative(
                            process.cwd(),
                            filePath
                        )
                        const link = `[${metadata.title}](./${relativePath})`
                        let content = ""

                        if (
                            hasInlineFiles &&
                            metadata.fileNameWithoutExt.startsWith("10")
                        ) {
                            content += `${exampleHeading} More examples\n\n`
                        }

                        content += `- **${link}**`

                        if (metadata.description) {
                            if (metadata.description.includes("\n")) {
                                const indentedDescription = metadata.description
                                    .split("\n")
                                    .map((line) => `  ${line}`)
                                    .join("\n")
                                content += `:\n${indentedDescription}`
                            } else {
                                content += `: ${metadata.description}`
                            }
                        }
                        return { order: unordered, name: file, content }
                    }

                    return { order: unordered, name: file, content: null }
                }),
            { concurrency: 5 }
        )

        const filteredContents: ReadonlyArray<string> = fileContents
            // Sections are sequenced by their index.md `order`; everything else
            // falls back to the filename sort applied above.
            .toSorted(
                (left, right) =>
                    left.order - right.order ||
                    left.name.localeCompare(right.name)
            )
            .map((entry) => entry.content)
            .filter(
                (content): content is string =>
                    content !== null && content.trim() !== ""
            )

        const tsFileContent = filteredContents.join("\n").trim()

        return {
            markdown: indexMd
                ? `${indexMd}\n\n${tsFileContent}`
                : tsFileContent,
            order: indexFrontmatter.order,
        }
    })

// Extract metadata from TypeScript file
const tsFileMetadata = (
    filePath: string
): Effect.Effect<FileMetadata, unknown, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* () {
        const pathService = yield* Path.Path
        const fs = yield* FileSystem.FileSystem

        const fullContent: string = yield* fs.readFileString(filePath)
        const fileNameWithoutExt = pathService.basename(
            filePath,
            pathService.extname(filePath)
        )

        let title: string = pipe(
            fileNameWithoutExt,
            String.replaceAll(/^\d+/g, ""),
            String.replaceAll(/[-_]/g, " "),
            String.trim,
            String.capitalize
        )

        let content = fullContent

        // `0` prefix is the legacy way of asking for the source to be inlined.
        // `@inline` is the explicit form, so a file can be renamed without
        // silently degrading into a bare link.
        let inline = fileNameWithoutExt.startsWith("0")

        const firstDocString = fullContent.indexOf("/**")
        if (firstDocString === -1) {
            return {
                title,
                description: undefined,
                content,
                fileNameWithoutExt,
                inline,
            } as const
        }

        const linesWithComment = fullContent.slice(firstDocString).split("\n")

        let description = ""

        for (let i = 1; i < linesWithComment.length; i++) {
            const line = linesWithComment[i]
            if (line === undefined) break
            if (!line.startsWith(" *")) break
            if (line.endsWith(" */")) {
                content = linesWithComment
                    .slice(i + 1)
                    .join("\n")
                    .trim()
                break
            }
            const lineContent = line.replace(/^ \*\s?/, "")
            if (lineContent.startsWith("@title")) {
                title = lineContent.replace("@title", "").trim()
                continue
            }
            if (lineContent.startsWith("@inline")) {
                inline = true
                continue
            }
            description += lineContent + "\n"
        }

        return {
            title,
            description: String.trim(description) || undefined,
            content,
            fileNameWithoutExt,
            inline,
        } as const
    })

// Run the program
program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
