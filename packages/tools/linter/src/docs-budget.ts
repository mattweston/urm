import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"

/**
 * `LLMS.md` is the context an agent gets for the whole repo, so its size is a
 * budget rather than an outcome. Every limit here exists to keep it an index:
 * a section's `index.md` summarises and links, and the detail it replaced lives
 * in the linked example's comments.
 *
 * Thresholds sit just above current values. They are meant to fail on drift,
 * not to leave room for it — raising one should be a decision.
 */
const maxIndexLines = 40
const maxInlineExampleLines = 80
const maxGeneratedLines = 800

/**
 * Inlining pastes a file's whole source into `LLMS.md`, so it is reserved for
 * the few idioms an agent must not get wrong — mirroring effect-smol, which
 * spells out four and links everything else. Adding to this list should be a
 * decision rather than a side effect of a filename.
 *
 * A `0` prefix is how docgen marks a file inline, matching effect-smol; the
 * allowlist is what stops that prefix spreading.
 */
const allowedInlineExamples: ReadonlySet<string> = new Set([
    "llm-docs/src/02_domain/01_schemas.ts",
    "llm-docs/src/03_contracts/01_rpc_routes.ts",
    "llm-docs/src/04_rpc/01_rpc_handler.ts",
    "llm-docs/src/08_features/01_foldkit_module.ts",
])

const docsDirectory = join(process.cwd(), "llm-docs", "src")
const generatedFile = join(process.cwd(), "LLMS.md")
const skippedDirectories = new Set(["fixtures", "node_modules"])

type Example = Readonly<{
    absolutePath: string
    relativePath: string
    fileName: string
}>

type Corpus = Readonly<{
    indexes: ReadonlyArray<Example>
    examples: ReadonlyArray<Example>
}>

const corpusIn = async (directory: string): Promise<Corpus> => {
    const entries = await readdir(directory, { withFileTypes: true })
    const indexes: Array<Example> = []
    const examples: Array<Example> = []

    for (const entry of entries) {
        const absolutePath = join(directory, entry.name)

        if (entry.isDirectory()) {
            if (
                skippedDirectories.has(entry.name) ||
                entry.name.startsWith(".") ||
                entry.name.startsWith("_")
            )
                continue
            const nested = await corpusIn(absolutePath)
            indexes.push(...nested.indexes)
            examples.push(...nested.examples)
            continue
        }

        const found: Example = {
            absolutePath,
            relativePath: relative(process.cwd(), absolutePath),
            fileName: entry.name,
        }

        if (entry.name === "index.md") indexes.push(found)
        else if (/\.tsx?$/.test(entry.name)) examples.push(found)
    }

    return { indexes, examples }
}

/** Headings inside fenced blocks are code, not structure. */
const headingLevelsIn = (content: string): ReadonlyArray<number> => {
    const levels: Array<number> = []
    let fenceCharacter: string | undefined

    for (const line of content.split(/\r?\n/)) {
        const first = line[0]
        if (
            (first === "`" || first === "~") &&
            line.startsWith(first.repeat(3))
        ) {
            fenceCharacter = fenceCharacter === undefined ? first : undefined
            continue
        }
        if (fenceCharacter !== undefined) continue

        const match = /^(#{1,6})\s/.exec(line)
        if (match !== null) levels.push((match[1] ?? "").length)
    }

    return levels
}

const withoutFrontmatter = (content: string): string =>
    content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")

const lineCount = (content: string): number =>
    content.trimEnd().split(/\r?\n/).length

/**
 * `@inline` is only honoured in the file's first doc block, and a `0` filename
 * prefix implies it. The two rules are OR-ed and there is no `@inline false`,
 * so a prefixed file cannot opt out — which is why the prefix is banned outright
 * rather than merely discouraged.
 */
const isTaggedInline = (content: string): boolean => {
    const start = content.indexOf("/**")
    if (start === -1) return false

    for (const line of content.slice(start).split(/\r?\n/).slice(1)) {
        if (!line.startsWith(" *")) break
        if (line.replace(/^ \*\s?/, "").startsWith("@inline")) return true
        if (line.endsWith(" */")) break
    }

    return false
}

const run = async (): Promise<void> => {
    const { indexes, examples } = await corpusIn(docsDirectory)
    const issues: Array<string> = []

    for (const index of indexes) {
        const content = await readFile(index.absolutePath, "utf8")
        const body = withoutFrontmatter(content)
        const lines = lineCount(body)

        if (lines > maxIndexLines) {
            issues.push(
                `${index.relativePath}: ${lines} lines exceeds the ${maxIndexLines}-line budget — move the detail into a sibling overview.md and leave a summary`
            )
        }

        const levels = headingLevelsIn(body)
        const h1Count = levels.filter((level) => level === 1).length

        if (h1Count !== 1) {
            issues.push(
                `${index.relativePath}: needs exactly one H1, found ${h1Count}`
            )
        }

        if (levels.some((level) => level > 1)) {
            issues.push(
                `${index.relativePath}: has subheadings — a section intro that needs them belongs in overview.md`
            )
        }
    }

    for (const example of examples) {
        const content = await readFile(example.absolutePath, "utf8")

        const inlined =
            example.fileName.startsWith("0") || isTaggedInline(content)

        if (!inlined) continue

        if (!allowedInlineExamples.has(example.relativePath)) {
            issues.push(
                `${example.relativePath}: inlining pastes the whole file into LLMS.md — renumber it 10_/20_ and drop @inline to link it, or add it to allowedInlineExamples with a reason`
            )
            continue
        }

        const lines = lineCount(content)
        if (lines > maxInlineExampleLines) {
            issues.push(
                `${example.relativePath}: ${lines} inlined lines exceeds the ${maxInlineExampleLines}-line budget — trim it or link it instead`
            )
        }
    }

    const generated = await readFile(generatedFile, "utf8").catch(
        () => undefined
    )
    if (generated === undefined) {
        issues.push(`LLMS.md is missing — run pnpm docgen:llm`)
    } else {
        const lines = lineCount(generated)
        if (lines > maxGeneratedLines) {
            issues.push(
                `LLMS.md: ${lines} lines exceeds the ${maxGeneratedLines}-line budget — compact a section intro or unlink an example`
            )
        }
    }

    if (issues.length === 0) {
        console.log(
            `Checked ${indexes.length} section intros and ${examples.length} examples against the LLMS.md budget.`
        )
        return
    }

    for (const issue of issues) console.error(issue)
    process.exitCode = 1
}

void run()
