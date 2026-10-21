import { Effect } from "effect"
import { createHash } from "node:crypto"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build as vite_build } from "vite"

import { DeploymentBuildError } from "./errors.ts"

export type SiteBehaviorAsset = Readonly<{
    output_path: string
    media_type: "text/css; charset=utf-8" | "text/javascript; charset=utf-8"
    content: string
    sha256: string
}>

export type SiteBehaviorBundle = Readonly<{
    entry_path: string
    assets: ReadonlyArray<SiteBehaviorAsset>
}>

const package_directory = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const media_type = (
    file_name: string
): SiteBehaviorAsset["media_type"] | undefined => {
    if (file_name.endsWith(".js")) return "text/javascript; charset=utf-8"
    if (file_name.endsWith(".css")) return "text/css; charset=utf-8"
    return undefined
}

export const build_event_behaviors = Effect.fn("SiteBehaviors.buildEvents")(
    function* () {
        const result = yield* Effect.tryPromise({
            try: () =>
                vite_build({
                    configFile: false,
                    root: package_directory,
                    base: "/assets/",
                    publicDir: false,
                    logLevel: "silent",
                    build: {
                        write: false,
                        minify: "esbuild",
                        sourcemap: false,
                        rollupOptions: {
                            input: resolve(
                                package_directory,
                                "src/client/event-details.client.ts"
                            ),
                            output: {
                                entryFileNames: "event-details-[hash].js",
                                chunkFileNames: "event-[name]-[hash].js",
                                assetFileNames: "event-[name]-[hash][extname]",
                            },
                        },
                    },
                }),
            catch: (cause) =>
                new DeploymentBuildError({
                    operation: "bundle public event behaviors",
                    cause,
                }),
        })
        if ("close" in result) {
            return yield* Effect.fail(
                new DeploymentBuildError({
                    operation: "bundle public event behaviors",
                })
            )
        }
        const outputs = Array.isArray(result)
            ? result.flatMap((bundle) => bundle.output)
            : result.output
        const entry = outputs.find(
            (output) => output.type === "chunk" && output.isEntry
        )
        if (entry === undefined) {
            return yield* Effect.fail(
                new DeploymentBuildError({
                    operation: "find public event behavior entry",
                })
            )
        }
        const assets = yield* Effect.forEach(outputs, (output) => {
            const type = media_type(output.fileName)
            if (type === undefined) {
                return Effect.fail(
                    new DeploymentBuildError({
                        operation: `classify public behavior asset ${output.fileName}`,
                    })
                )
            }
            const content =
                output.type === "chunk"
                    ? output.code
                    : typeof output.source === "string"
                      ? output.source
                      : new TextDecoder().decode(output.source)
            return Effect.succeed({
                output_path: `assets/${output.fileName}`,
                media_type: type,
                content,
                sha256: createHash("sha256").update(content).digest("hex"),
            })
        })

        return {
            entry_path: `assets/${entry.fileName}`,
            assets,
        } satisfies SiteBehaviorBundle
    }
)
