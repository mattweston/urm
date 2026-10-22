import { Context, Effect, Layer } from "effect"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join, resolve, sep } from "node:path"
import { OutputError } from "./errors.js"

/** Where built HTML goes, and how stale copies are invalidated (CDN purge etc.). */
export interface OutputService {
  readonly write: (route: string, html: string) => Effect.Effect<void, OutputError>
  readonly purge: (routes: ReadonlyArray<string>) => Effect.Effect<void, OutputError>
}

export class Output extends Context.Tag("effect-marko/Output")<Output, OutputService>() {}

/**
 * "/" -> dist/index.html, "/a/b" -> dist/a/b/index.html.
 * Throws on any route that could escape `distDir`.
 */
export const routeToFile = (distDir: string, route: string): string => {
  const segments = route.split("/").filter((s) => s.length > 0)
  for (const s of segments) {
    if (s === "." || s === ".." || s.includes("\\") || s.includes("\0")) {
      throw new Error(`unsafe route segment: ${JSON.stringify(s)}`)
    }
  }
  const root = resolve(distDir)
  const file = resolve(join(root, ...segments, "index.html"))
  if (!file.startsWith(root + sep)) throw new Error("route escapes output directory")
  return file
}

/** Writes HTML under `distDir`. `purge` is a no-op: supply your own CDN layer. */
export const nodeOutput = (distDir: string) =>
  Layer.succeed(Output, {
    write: (route, html) =>
      Effect.tryPromise({
        try: async () => {
          const file = routeToFile(distDir, route)
          await mkdir(dirname(file), { recursive: true })
          await writeFile(file, html, "utf8")
        },
        catch: (cause) => new OutputError({ path: route, cause }),
      }),
    purge: () => Effect.void,
  })

/** For tests. */
export const memoryOutput = (files: Map<string, string>, purged: string[] = []) =>
  Layer.succeed(Output, {
    write: (route, html) =>
      Effect.sync(() => {
        files.set(route, html)
      }),
    purge: (routes) =>
      Effect.sync(() => {
        purged.push(...routes)
      }),
  })
