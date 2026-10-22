import { Effect } from "effect"
import { affectedRoutes, buildDepMap, type DepMap } from "./DepMap.js"
import type { OutputError, StoreError } from "./errors.js"
import { Marko, type MarkoError } from "./Marko.js"
import { Output } from "./Output.js"
import { Store } from "./Store.js"
import type { PageBase } from "./types.js"

export interface PageFailure {
  readonly route: string
  readonly error: MarkoError | OutputError
}

export interface BuildReport {
  readonly rendered: ReadonlyArray<string>
  readonly failed: ReadonlyArray<PageFailure>
}

type PageResult =
  | { readonly ok: true; readonly route: string }
  | { readonly ok: false; readonly route: string; readonly error: MarkoError | OutputError }

export const isSsg = (page: PageBase): boolean => (page.mode ?? "ssg") === "ssg"

/** Render and write pages. One page failing does not stop the others; failures are reported. */
export const renderPages = (
  pages: ReadonlyArray<PageBase>,
  concurrency = 8,
): Effect.Effect<BuildReport, never, Marko | Output> =>
  Effect.gen(function* () {
    const marko = yield* Marko
    const out = yield* Output
    const results = yield* Effect.forEach(
      pages,
      (page) =>
        marko.renderPage(page).pipe(
          Effect.flatMap((html) => out.write(page.route, html)),
          Effect.map((): PageResult => ({ ok: true, route: page.route })),
          Effect.catchAll((error) =>
            Effect.succeed<PageResult>({ ok: false, route: page.route, error }),
          ),
        ),
      { concurrency },
    )
    return {
      rendered: results.filter((r) => r.ok).map((r) => r.route),
      failed: results.flatMap((r) => (r.ok ? [] : [{ route: r.route, error: r.error }])),
    }
  })

/** Mode A: full SSG. Renders every page whose mode is "ssg". */
export const buildAll: Effect.Effect<
  BuildReport,
  StoreError | OutputError,
  Marko | Store | Output
> = Effect.gen(function* () {
  const store = yield* Store
  const out = yield* Output
  const pages = yield* store.allPages
  const report = yield* renderPages(pages.filter(isSsg))
  yield* out.purge(report.rendered)
  return report
})

export interface PublishChange {
  readonly blocks: ReadonlyArray<string>
  readonly routes: ReadonlyArray<string>
  /** True when a template or layout changed: affects every page that uses it. */
  readonly templates: boolean
}

export type Plan =
  | { readonly _tag: "Full" }
  | { readonly _tag: "Incremental"; readonly routes: ReadonlyArray<string> }
  | { readonly _tag: "StoreOnly" }

/**
 * Pure decision of what a publish needs:
 *  - template/layout change        -> Full
 *  - affected SSG pages exist       -> Incremental (only those)
 *  - only SSR pages affected        -> StoreOnly (they read fresh data per request)
 */
export const planPublish = (
  change: PublishChange,
  pages: ReadonlyArray<PageBase>,
  dep: DepMap,
): Plan => {
  if (change.templates) return { _tag: "Full" }
  const affected = affectedRoutes(dep, change)
  const routes = pages.filter((p) => isSsg(p) && affected.has(p.route)).map((p) => p.route)
  return routes.length === 0 ? { _tag: "StoreOnly" } : { _tag: "Incremental", routes }
}

export interface PublishResult {
  readonly plan: Plan
  readonly report: BuildReport
}

/** Execute a publish: plan, render what is needed, purge what was written. */
export const publish = (
  change: PublishChange,
): Effect.Effect<PublishResult, StoreError | OutputError, Marko | Store | Output> =>
  Effect.gen(function* () {
    const store = yield* Store
    const marko = yield* Marko
    const out = yield* Output
    const pages = yield* store.allPages
    const plan = planPublish(change, pages, buildDepMap(pages))

    const report: BuildReport = yield* (() => {
      switch (plan._tag) {
        case "Full":
          return marko.invalidateTemplates.pipe(
            Effect.zipRight(renderPages(pages.filter(isSsg))),
          )
        case "Incremental": {
          const wanted = new Set(plan.routes)
          return renderPages(pages.filter((p) => wanted.has(p.route)))
        }
        case "StoreOnly":
          return Effect.succeed<BuildReport>({ rendered: [], failed: [] })
      }
    })()

    if (report.rendered.length > 0) yield* out.purge(report.rendered)
    return { plan, report }
  })
