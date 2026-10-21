import { createHash } from "node:crypto"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import { Schema } from "effect"
import { collect_corpus } from "./corpus.ts"
export { collect_corpus, local_roots } from "./corpus.ts"

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

export const capture = async (
    repository: string,
    roots: ReadonlyArray<string>
) => {
    const { contents, manifest } = await collect_corpus(repository, roots)
    const directory = await mkdtemp(resolve(tmpdir(), "urm-grep-"))
    const content_root = resolve(directory, "content")
    await mkdir(content_root)
    for (const [path, bytes] of contents) {
        const target = resolve(content_root, path)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, bytes, { mode: 0o400 })
    }
    await writeFile(
        resolve(directory, "manifest.json"),
        JSON.stringify(manifest, null, 4),
        { mode: 0o600 }
    )
    return { directory, content_root, contents, manifest }
}

export const validate_query = (query: string) => {
    if (query.includes("\r") || query.includes("\n") || query.includes("\0"))
        throw new Error("Query must be a single line without NUL")
    if (Array.from(query).length > 1024)
        throw new Error("Query exceeds 1024 codepoints")
    if (!query.isWellFormed())
        throw new Error("Query contains an unpaired surrogate")
}

export function* literal_matches(bytes: Buffer, query: string) {
    validate_query(query)
    if (query === "") return
    const needle = Buffer.from(query)
    let line = 1
    let line_start = 0
    let scanned = 0
    for (
        let offset = bytes.indexOf(needle);
        offset !== -1;
        offset = bytes.indexOf(needle, offset + needle.length)
    ) {
        for (let index = scanned; index < offset; index++) {
            if (bytes[index] === 10) {
                line++
                line_start = index + 1
            }
        }
        scanned = offset
        yield {
            start: offset,
            end: offset + needle.length,
            line,
            column: utf8.decode(bytes.subarray(line_start, offset)).length + 1,
        }
    }
}

const Envelope = Schema.Struct({ type: Schema.String })
const Match = Schema.Struct({
    data: Schema.Struct({
        path: Schema.Struct({ text: Schema.String }),
        lines: Schema.Struct({ text: Schema.String }),
        line_number: Schema.Number,
        absolute_offset: Schema.Number,
        submatches: Schema.Array(
            Schema.Struct({ start: Schema.Number, end: Schema.Number })
        ),
    }),
})
interface Position {
    start: number
    end: number
    line: number
    column: number
}
const position_key = (match: Position) =>
    `${match.start}:${match.end}:${match.line}:${match.column}\n`

export const benchmark = async (
    snapshot: Awaited<ReturnType<typeof capture>>,
    query: string
) => {
    validate_query(query)
    const expected = new Map<string, { count: number; digest: string }>()
    for (const entry of snapshot.manifest.entries) {
        const bytes = snapshot.contents.get(entry.path)
        if (bytes === undefined)
            throw new Error(`Missing captured text: ${entry.path}`)
        const digest = createHash("sha256")
        let count = 0
        for (const match of literal_matches(bytes, query)) {
            count++
            digest.update(position_key(match))
        }
        if (count > 0)
            expected.set(entry.path, { count, digest: digest.digest("hex") })
    }
    if (query === "")
        return {
            query,
            files: 0,
            occurrences: 0,
            first_result_ms: null,
            complete_ms: 0,
        }
    const started = performance.now()
    const child = spawn(
        "rg",
        [
            "--no-config",
            "--fixed-strings",
            "--case-sensitive",
            "--json",
            "--hidden",
            "--no-ignore",
            "--text",
            "--sort",
            "path",
            "--",
            query,
            ".",
        ],
        { cwd: snapshot.content_root, stdio: ["ignore", "pipe", "pipe"] }
    )
    const completed = new Promise<number | null>((resolve_status, reject) => {
        child.once("error", reject)
        child.once("close", resolve_status)
    })
    let stderr = ""
    child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString()
    })
    const actual = new Map<
        string,
        { count: number; digest: ReturnType<typeof createHash> }
    >()
    let first_result_ms: number | null = null
    try {
        for await (const line of createInterface({ input: child.stdout })) {
            const value: unknown = JSON.parse(line)
            if (Schema.decodeUnknownSync(Envelope)(value).type !== "match")
                continue
            const { data } = Schema.decodeUnknownSync(Match)(value)
            first_result_ms ??= performance.now() - started
            const path = data.path.text.replace(/^\.\//, "")
            const state = actual.get(path) ?? {
                count: 0,
                digest: createHash("sha256"),
            }
            const bytes = Buffer.from(data.lines.text)
            for (const match of data.submatches) {
                state.count++
                state.digest.update(
                    position_key({
                        start: data.absolute_offset + match.start,
                        end: data.absolute_offset + match.end,
                        line: data.line_number,
                        column:
                            utf8.decode(bytes.subarray(0, match.start)).length +
                            1,
                    })
                )
            }
            actual.set(path, state)
        }
    } catch (error) {
        child.kill()
        await completed.catch(() => undefined)
        throw error
    }
    const status = await completed
    const complete_ms = performance.now() - started
    if (status !== 0 && status !== 1)
        throw new Error(`ripgrep failed (${status}): ${stderr}`)
    if (actual.size !== expected.size)
        throw new Error(`File count mismatch for ${JSON.stringify(query)}`)
    let occurrences = 0
    for (const [path, state] of actual) {
        const wanted = expected.get(path)
        if (
            wanted?.count !== state.count ||
            wanted.digest !== state.digest.digest("hex")
        )
            throw new Error(
                `Occurrence mismatch: ${path}, query ${JSON.stringify(query)}`
            )
        occurrences += state.count
    }
    return {
        query,
        files: actual.size,
        occurrences,
        first_result_ms,
        complete_ms,
    }
}
