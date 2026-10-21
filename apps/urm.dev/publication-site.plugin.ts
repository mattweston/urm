import { resolve } from "node:path"
import { Layer, ManagedRuntime } from "effect"
import { makeDatabaseLiveFromUrl } from "@urm/db"
import { SqlLive } from "@urm/db/sql"
import { localPublicationHost } from "@urm/utils/hosts"
import { loadEnv, type Connect, type Plugin } from "vite"

import {
    read_publication_asset,
    resolve_postgres_publication,
} from "./publication-site.server.ts"

const repository_root = resolve(import.meta.dirname, "../..")

export const publication_site = (): Plugin => ({
    name: "urm-local-publication-site",
    enforce: "pre",
    configureServer(server) {
        const env = loadEnv(server.config.mode, server.config.envDir, [
            "DATABASE_URL",
        ])
        const postgres_runtime = env.DATABASE_URL
            ? ManagedRuntime.make(
                  SqlLive.pipe(
                      Layer.provide(
                          makeDatabaseLiveFromUrl(
                              env.DATABASE_URL,
                              "development"
                          )
                      ),
                      Layer.orDie
                  )
              )
            : undefined
        server.httpServer?.once("close", () => {
            if (postgres_runtime !== undefined) void postgres_runtime.dispose()
        })
        const handle: Connect.NextHandleFunction = async (req, res, next) => {
            const host = req.headers.host
            if (typeof host !== "string") return next()
            const suffix_root = host.includes(".urm.test") ? "urm.test" : ""
            const target = localPublicationHost(host, suffix_root)
            if (target === undefined) return next()
            if (req.method !== "GET" && req.method !== "HEAD") {
                res.statusCode = 405
                res.setHeader("Allow", "GET, HEAD")
                res.end("Publication hosts are read-only.")
                return
            }
            if (postgres_runtime === undefined) {
                res.statusCode = 503
                res.end(
                    "Local publication routing needs a database connection."
                )
                return
            }

            try {
                const lookup =
                    target.kind === "channel"
                        ? target
                        : {
                              domain_slug: target.domain_slug,
                              subdomain_slug: target.subdomain_slug,
                              channel: target.channel,
                          }
                const artifact = await postgres_runtime.runPromise(
                    resolve_postgres_publication(lookup)
                )
                if (artifact === null || artifact === undefined) {
                    res.statusCode = 404
                    res.end(
                        "No successful deployment exists for this publication host."
                    )
                    return
                }

                const request_url = new URL(req.url ?? "/", "http://localhost")
                const asset = await read_publication_asset(
                    repository_root,
                    artifact.output_directory,
                    request_url.pathname
                )
                if (asset === undefined) {
                    res.statusCode = 404
                    res.end(
                        "This route is not present in the deployed release."
                    )
                    return
                }

                res.statusCode = 200
                res.setHeader("Cache-Control", "no-cache")
                res.setHeader("Content-Type", asset.media_type)
                if (
                    target.channel === "development" ||
                    target.channel === "staging"
                ) {
                    res.setHeader("X-Robots-Tag", "noindex, nofollow")
                }
                res.end(req.method === "HEAD" ? undefined : asset.body)
            } catch {
                res.statusCode = 502
                res.end("The deployed release could not be loaded.")
            }
        }

        server.middlewares.use((req, res, next) => {
            Promise.resolve(handle(req, res, next)).catch(() => {
                res.statusCode = 500
                res.end("Local publication routing failed.")
            })
        })
    },
})
