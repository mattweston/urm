import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

const docsDirectory = join(process.cwd(), "llm-docs", "src")
const fix = process.argv.includes("--fix")
const markdownExtensions = new Set([".md", ".mdx"])
const headingFromFileName = (relativePath: string): string => {
    const fileName = relativePath.split("/").at(-1) ?? relativePath
    const stem = fileName.replace(/\.(?:md|mdx)$/, "")
    return stem
        .split(/[-_]+/)
        .filter((word) => word.length > 0)
        .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
        .join(" ")
}
const skippedDirectories = new Set(["fixtures", "node_modules"])

type Document = Readonly<{
    absolutePath: string
    relativePath: string
    isIndex: boolean
}>

type Frontmatter = Readonly<{
    body: string
    lines: ReadonlyArray<string>
    title: string | undefined
}>

const documentsIn = async (
    directory: string
): Promise<ReadonlyArray<Document>> => {
    const entries = await readdir(directory, { withFileTypes: true })
    const documents: Array<Document> = []

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (
                skippedDirectories.has(entry.name) ||
                entry.name.startsWith(".") ||
                entry.name.startsWith("_")
            )
                continue
            documents.push(...(await documentsIn(join(directory, entry.name))))
            continue
        }

        const extension = entry.name.slice(entry.name.lastIndexOf("."))
        if (!markdownExtensions.has(extension)) continue

        const absolutePath = join(directory, entry.name)
        documents.push({
            absolutePath,
            relativePath: relative(process.cwd(), absolutePath),
            isIndex: entry.name === "index.md" || entry.name === "index.mdx",
        })
    }

    return documents
}

const titleFrom = (line: string): string | undefined => {
    const match = /^title:\s*(?:"([^"]*)"|'([^']*)'|(.+?))\s*$/.exec(line)
    if (match === null) return undefined
    return match[1] ?? match[2] ?? match[3]
}

const frontmatterFrom = (content: string): Frontmatter | undefined => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content)
    if (match === null) return undefined

    const lines = (match[1] ?? "").split(/\r?\n/)
    return {
        body: content.slice(match[0].length),
        lines,
        title: lines.map(titleFrom).find((value) => value !== undefined),
    }
}

const h1TitlesIn = (content: string): ReadonlyArray<string> => {
    const titles: Array<string> = []
    let codeFence: string | undefined

    for (const line of content.split(/\r?\n/)) {
        const fenceCharacter = line[0]
        if (
            (fenceCharacter === "`" || fenceCharacter === "~") &&
            line.startsWith(fenceCharacter.repeat(3))
        ) {
            codeFence = codeFence === undefined ? fenceCharacter : undefined
            continue
        }

        if (codeFence !== undefined) continue

        const match = /^# (.+)$/.exec(line)
        if (match !== null) titles.push(match[1] ?? "")
    }

    return titles
}

const withoutTitle = (frontmatter: Frontmatter, newline: string): string => {
    const lines = frontmatter.lines.filter(
        (line) => titleFrom(line) === undefined
    )
    return lines.length === 0
        ? ""
        : `---${newline}${lines.join(newline)}${newline}---${newline}${newline}`
}

const migratedContent = (
    content: string,
    frontmatter: Frontmatter
): string | undefined => {
    if (frontmatter.title === undefined) return undefined

    const h1Titles = h1TitlesIn(frontmatter.body)
    if (h1Titles.length > 1) return undefined

    const newline = content.includes("\r\n") ? "\r\n" : "\n"
    const prefix = withoutTitle(frontmatter, newline)
    const body = frontmatter.body.trimStart()
    return h1Titles.length === 1
        ? `${prefix}${body.replace(/^# .+$/m, `# ${frontmatter.title}`)}`
        : `${prefix}# ${frontmatter.title}${newline}${newline}${body}`
}

const run = async (): Promise<void> => {
    const documents = await documentsIn(docsDirectory)
    const issues: Array<string> = []
    let fixed = 0

    for (const document of documents) {
        const content = await readFile(document.absolutePath, "utf8")
        const frontmatter = frontmatterFrom(content)
        const h1Titles = h1TitlesIn(frontmatter?.body ?? content)

        if (frontmatter?.title !== undefined) {
            const migrated = migratedContent(content, frontmatter)
            if (migrated === undefined) {
                issues.push(
                    `${document.relativePath}: frontmatter title does not match its single Markdown H1`
                )
            } else if (fix) {
                await writeFile(document.absolutePath, migrated)
                fixed += 1
                continue
            } else {
                issues.push(
                    `${document.relativePath}: move frontmatter title to a Markdown H1`
                )
            }
        }

        if (h1Titles.length === 0 && fix) {
            const heading = headingFromFileName(document.relativePath)
            await writeFile(
                document.absolutePath,
                `# ${heading}\n\n${content.trimStart()}`
            )
            fixed += 1
            continue
        }
    }

    if (fix) {
        console.log(
            `Fixed ${fixed} documentation title${fixed === 1 ? "" : "s"}.`
        )
        return
    }

    if (issues.length === 0) {
        console.log(`Checked ${documents.length} documentation files.`)
        return
    }

    for (const issue of issues) console.error(issue)
    process.exitCode = 1
}

void run()
