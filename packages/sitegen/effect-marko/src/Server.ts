import { Effect, Option, type Stream } from "effect"
import type { StoreError } from "./errors.js"
import { Marko, type MarkoError } from "./Marko.js"
import { Store } from "./Store.js"

/**
 * Framework-agnostic request handler. Wrap it in whatever HTTP server you use
 * (node:http, @effect/platform, Express) and adapt the Stream body.
 */
export interface HttpRequestLike {
  readonly url: string
  readonly headers: Headers
}

export interface HttpResponseLike {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  /** A string for documents; a Stream of flush lines for patch renders. */
  readonly body: string | Stream.Stream<string, MarkoError>
}

/** ASSUMED: the response uses the same media type the client asks for. Check against @marko/run. */
export const PATCH_MIME = "text/marko-patch"

/** Responses at one URL differ by these request headers. */
const VARY = "Accept, x-marko-patch"

export const normalizeRoute = (url: string): string => {
  const path = new URL(url, "http://localhost").pathname
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

const respond = (r: HttpResponseLike): HttpResponseLike => r

/**
 * - `accept: text/marko-patch`  -> patch render stream (live page navigation)
 * - anything else               -> full HTML document
 * - unknown route               -> 404
 * Input to the template comes only from the route and the store, never from the request body.
 *
 * Known gap: a failure after the patch stream starts surfaces as a stream error. What the client
 * does with a stream that dies between flushes is untested.
 */
export const handle = (
  req: HttpRequestLike,
): Effect.Effect<HttpResponseLike, never, Marko | Store> =>
  Effect.gen(function* () {
    const marko = yield* Marko
    const store = yield* Store
    const page = yield* store.page(normalizeRoute(req.url))
    if (Option.isNone(page)) {
      return respond({ status: 404, headers: { "content-type": "text/plain" }, body: "Not found" })
    }
    if ((req.headers.get("accept") ?? "").includes(PATCH_MIME)) {
      return respond({
        status: 200,
        // no-store is a conservative choice (inference); relax once cache keying is understood.
        headers: { "content-type": PATCH_MIME, vary: VARY, "cache-control": "no-store" },
        body: marko.patchPage(page.value, req.headers),
      })
    }
    const html = yield* marko.renderPage(page.value)
    return respond({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", vary: VARY },
      body: html,
    })
  }).pipe(
    Effect.catchAll((error: StoreError | MarkoError) =>
      // Only the tag is exposed; causes may contain internals.
      Effect.succeed(
        respond({
          status: 500,
          headers: { "content-type": "text/plain" },
          body: `Render failed: ${error._tag}`,
        }),
      ),
    ),
  )
