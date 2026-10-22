import { resolve } from "node:path"
import { Schema } from "effect"
import type { Plugin, Connect } from "vite"
import {
    SearchRequest,
    SearchResponse,
    SuggestRequest,
    suggest_topics,
} from "@urm/features/labs/dev/grep"
import {
    load_search_corpus,
    search_corpus,
    search_roots,
} from "./grep-search.server.ts"

const module_id = "virtual:grep-preview"
const resolved_id = `\0${module_id}`
const repository = resolve(import.meta.dirname, "../..")

export const grep_preview = (
    load_corpus = () => load_search_corpus(repository)
): Plugin => {
    let enabled = false
    let corpus: ReturnType<typeof load_search_corpus> | undefined
    return {
        name: "urm-grep-preview",
        configResolved(config) {
            enabled = config.command === "serve"
        },
        resolveId(id) {
            if (id === module_id) return resolved_id
        },
        load(id) {
            if (id === resolved_id)
                return `export default { snapshot: "${enabled ? "remote" : "unavailable"}", files: [], sections: [], diagnostics: [] }`
        },
        configureServer(server) {
            const roots = search_roots.map((root) => resolve(repository, root))
            server.watcher.add(roots)
            const invalidate = (_event: string, path: string) => {
                if (
                    roots.some(
                        (root) => path === root || path.startsWith(`${root}/`)
                    )
                )
                    corpus = undefined
            }
            server.watcher.on("all", invalidate)
            server.httpServer?.once("close", () =>
                server.watcher.off("all", invalidate)
            )
            const handle: Connect.NextHandleFunction = async (
                req,
                res,
                next
            ) => {
                const path = req.url?.split("?")[0]
                if (
                    path !== "/__urm/grep/search" &&
                    path !== "/__urm/grep/suggest"
                )
                    return next()
                res.setHeader("Cache-Control", "no-store")
                res.setHeader("Content-Type", "application/json")
                const send_error = (status: number, error: string) => {
                    res.statusCode = status
                    res.end(JSON.stringify({ error }))
                }
                if (req.method !== "POST") return send_error(405, "Use POST.")
                if (
                    req.headers["x-urm-grep"] !== "1" ||
                    req.headers["sec-fetch-site"] === "cross-site"
                )
                    return send_error(
                        403,
                        "Same-origin development requests only."
                    )
                if (req.headers.origin !== undefined) {
                    try {
                        if (
                            new URL(req.headers.origin).host !==
                            req.headers.host
                        )
                            return send_error(403, "Origin mismatch.")
                    } catch {
                        return send_error(403, "Invalid origin.")
                    }
                }
                const controller = new AbortController()
                const cancel = () => controller.abort()
                req.once("aborted", cancel)
                res.once("close", cancel)
                try {
                    const chunks: Buffer[] = []
                    let size = 0
                    for await (const chunk of req) {
                        const bytes = Schema.decodeUnknownSync(
                            Schema.instanceOf(Buffer)
                        )(chunk)
                        size += bytes.length
                        if (size > 16_384)
                            return send_error(413, "Search request too large.")
                        chunks.push(bytes)
                    }
                    const value: unknown = JSON.parse(
                        Buffer.concat(chunks).toString("utf8")
                    )
                    const suggestion =
                        path === "/__urm/grep/suggest"
                            ? Schema.decodeUnknownSync(SuggestRequest)(value)
                            : undefined
                    const request =
                        suggestion === undefined
                            ? Schema.decodeUnknownSync(SearchRequest)(value)
                            : undefined
                    corpus ??= load_corpus().catch((error: unknown) => {
                        corpus = undefined
                        throw error
                    })
                    const snapshot = await corpus
                    controller.signal.throwIfAborted()
                    if (suggestion !== undefined) {
                        res.end(
                            JSON.stringify({
                                suggestions: suggest_topics(
                                    snapshot.sections,
                                    suggestion.query
                                ),
                            })
                        )
                        return
                    }
                    if (request === undefined) return
                    if (
                        request.snapshot !== "" &&
                        request.snapshot !== snapshot.snapshot
                    )
                        return send_error(
                            409,
                            "The corpus changed. Restart the search to reset pagination."
                        )
                    const result = await search_corpus(
                        snapshot,
                        request,
                        controller.signal
                    )
                    const body = JSON.stringify(
                        Schema.encodeSync(SearchResponse)(result)
                    )
                    if (Buffer.byteLength(body) > 2_000_000)
                        return send_error(
                            413,
                            "These excerpts exceed the response limit. Refine the query."
                        )
                    res.end(body)
                } catch (error) {
                    if (!controller.signal.aborted)
                        send_error(
                            400,
                            error instanceof Error
                                ? error.message
                                : "Search failed."
                        )
                } finally {
                    req.off("aborted", cancel)
                    res.off("close", cancel)
                }
            }
            server.middlewares.use((req, res, next) => {
                Promise.resolve(handle(req, res, next)).catch(
                    (error: unknown) => {
                        if (res.headersSent)
                            res.destroy(
                                error instanceof Error ? error : undefined
                            )
                        else {
                            res.statusCode = 500
                            res.end(JSON.stringify({ error: "Search failed." }))
                        }
                    }
                )
            })
        },
    }
}
