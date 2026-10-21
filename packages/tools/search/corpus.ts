import { createHash } from "node:crypto"
import { constants } from "node:fs"
import { lstat, open, readdir, realpath } from "node:fs/promises"
import { extname, isAbsolute, relative, resolve } from "node:path"

export const local_roots = [
    "apps/client/src",
    "apps/server/src",
    "packages/auth/src",
    "packages/contracts/src",
    "packages/db/src",
    "packages/domain/src",
    "packages/domain/test",
    "packages/features/src",
    "packages/features/test",
    "packages/rpc/src",
    "packages/ui/src",
    "packages/email/src",
    "packages/email/test",
    "packages/ssg/src",
    "packages/ssg/test",
    ".patterns",
    ".agents/skills",
]

const excluded_directories = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "logs",
    ".cache",
    ".turbo",
    ".vite",
    "_generated",
    ".todo",
    "target",
    ".next",
    ".astro",
    "repos",
    ".repos",
])
const extensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".md",
    ".mdx",
    ".astro",
    ".css",
    ".sql",
    ".svelte",
    ".vue",
])
const environment_examples = new Set([".env.example", "env.example"])
const sensitive_name = (name: string) =>
    (!environment_examples.has(name) && /^(?:\.env|env(?:\.|$))/i.test(name)) ||
    /credential|secret|^id_(?:rsa|ed25519|ecdsa|dsa)(?:\.|$)|\.(?:pem|key|p12|pfx|keystore)$/i.test(
        name
    )

const hash = (value: string | Buffer) =>
    createHash("sha256").update(value).digest("hex")
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
const compare = (left: string, right: string) =>
    left < right ? -1 : left > right ? 1 : 0

export interface Entry {
    path: string
    bytes: number
    sha256: string
    origin: string
    kind: string
}
export interface Skip {
    path: string
    reason: string
}

const inside = (root: string, path: string) => {
    const result = relative(root, path)
    return result !== ".." && !result.startsWith("../") && !isAbsolute(result)
}

const read_regular = async (root: string, path: string) => {
    if (!inside(root, await realpath(path)))
        throw new Error(`Path escaped root: ${path}`)
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
        const before = await file.stat()
        if (!before.isFile()) throw new Error(`Not a regular file: ${path}`)
        const bytes = await file.readFile()
        const after = await file.stat()
        if (
            before.mtimeMs !== after.mtimeMs ||
            before.ctimeMs !== after.ctimeMs ||
            before.size !== after.size
        )
            throw new Error(`File changed during capture: ${path}`)
        return bytes
    } finally {
        await file.close()
    }
}

export const collect_corpus = async (
    repository: string,
    roots: ReadonlyArray<string>
) => {
    const root = await realpath(repository)
    const entries: Entry[] = []
    const skipped: Skip[] = []
    const contents = new Map<string, Buffer>()
    const seen = new Set<string>()
    const walk = async (path: string): Promise<void> => {
        const absolute = resolve(root, path)
        if (!inside(root, absolute))
            throw new Error(`Invalid corpus path: ${path}`)
        if (seen.has(path)) return
        seen.add(path)
        const name = path.split("/").at(-1) ?? path
        if (sensitive_name(name)) {
            skipped.push({ path, reason: "sensitive-name" })
            return
        }
        const info = await lstat(absolute)
        if (info.isSymbolicLink()) {
            skipped.push({ path, reason: "symlink" })
            return
        }
        if (info.isDirectory()) {
            if (excluded_directories.has(name)) {
                skipped.push({ path, reason: "excluded-directory" })
                return
            }
            for (const child of (await readdir(absolute)).toSorted(compare))
                await walk(`${path}/${child}`)
            return
        }
        if (
            !info.isFile() ||
            (!extensions.has(extname(name)) &&
                !environment_examples.has(name)) ||
            name.endsWith(".d.ts") ||
            name.endsWith(".min.js") ||
            ["urm-grep-effect-grep.original.js", "page-example.html"].includes(
                name
            )
        ) {
            skipped.push({ path, reason: "excluded-file" })
            return
        }
        const bytes = await read_regular(root, absolute)
        let text: string
        try {
            text = utf8.decode(bytes)
        } catch {
            skipped.push({ path, reason: "invalid-utf8" })
            return
        }
        if (bytes.includes(0)) {
            skipped.push({ path, reason: "binary" })
            return
        }
        if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(text)) {
            skipped.push({ path, reason: "private-key-marker" })
            return
        }
        if (
            /(?:@generated|automatically generated|code generated .*do not edit)/i.test(
                text.slice(0, 1024)
            )
        ) {
            skipped.push({ path, reason: "generated-marker" })
            return
        }
        contents.set(path, bytes)
        entries.push({
            path,
            bytes: bytes.length,
            sha256: hash(bytes),
            origin: path.startsWith(".context/")
                ? path.split("/").slice(0, 2).join("/")
                : "urm",
            kind: /\.mdx?$/.test(path)
                ? "markdown"
                : /(?:\/test\/|\.(?:test|spec)\.)/.test(path)
                  ? "test"
                  : "source",
        })
    }
    for (const path of roots) {
        if (
            isAbsolute(path) ||
            path
                .split("/")
                .some((part) => part === ".." || part === "." || part === "")
        )
            throw new Error(`Invalid corpus root: ${path}`)
        let ancestor = root
        for (const part of path.split("/")) {
            if (sensitive_name(part) || excluded_directories.has(part))
                throw new Error(`Excluded corpus root: ${path}`)
            ancestor = resolve(ancestor, part)
            if ((await lstat(ancestor)).isSymbolicLink())
                throw new Error(`Symlink corpus root: ${path}`)
        }
        await walk(path)
    }
    entries.sort((left, right) => compare(left.path, right.path))
    for (const entry of entries) {
        if (
            hash(await read_regular(root, resolve(root, entry.path))) !==
            entry.sha256
        )
            throw new Error(
                `File changed before capture completed: ${entry.path}`
            )
    }
    const manifest = {
        version: 1,
        snapshot: hash(JSON.stringify(entries)),
        roots,
        entries,
        skipped,
    }
    return { contents, manifest }
}
