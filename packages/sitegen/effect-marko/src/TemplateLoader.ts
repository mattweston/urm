import { Context, Effect, Layer } from "effect"
import { pathToFileURL } from "node:url"
import { TemplateLoadError } from "./errors.js"
import type { TemplateRef } from "./types.js"

/**
 * What the wrapper needs from a loaded Marko template.
 *
 * UNVERIFIED against Marko: the names and shapes below are assumptions.
 *  - `renderToString(input)`: a Promise of HTML.
 *  - `patch(input, headers)`: the patch render from your branch, as an async iterable
 *    where each item is one flush line. Check RESUMABILITY.md / CONTEXT.md for the real shape.
 */
export interface TemplateModule {
  readonly renderToString: (input: unknown) => Promise<string>
  readonly patch?: (input: unknown, headers: Headers) => AsyncIterable<string>
}

export interface TemplateLoaderService {
  readonly load: (ref: TemplateRef) => Effect.Effect<TemplateModule, TemplateLoadError>
}

export class TemplateLoader extends Context.Tag("effect-marko/TemplateLoader")<
  TemplateLoader,
  TemplateLoaderService
>() {}

/**
 * Loads templates from a built server bundle (e.g. the output of a Vite build with
 * @marko/vite). `resolvePath` maps a ref to an absolute file path.
 * Expects the module's default export (or the module itself) to match TemplateModule.
 */
export const bundleLoader = (resolvePath: (ref: TemplateRef) => string) =>
  Layer.succeed(TemplateLoader, {
    load: (ref) =>
      Effect.tryPromise({
        try: async () => {
          const mod = await import(pathToFileURL(resolvePath(ref)).href)
          const template = mod.default ?? mod
          if (typeof template?.renderToString !== "function") {
            throw new Error("module does not export a template with renderToString")
          }
          return template as TemplateModule
        },
        catch: (cause) => new TemplateLoadError({ template: ref.id, cause }),
      }),
  })
