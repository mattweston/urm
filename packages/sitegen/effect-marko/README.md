# effect-marko (sketch)

An Effect wrapper around Marko for block-based sites: one render path (`Marko` service) used by full SSG, incremental SSG, live SSR and patch renders. Design notes live in the `effect-marko-docs` files; this is the code skeleton that goes with them.

**Status:** typechecks and passes a smoke test against stub templates (`npm run smoke`, Effect 3.22.4, TypeScript 5.9.3). It has **not** been run against real Marko.

## Layout

| File | Role |
|------|------|
| `src/types.ts` | `BlockBase`, `PageBase`, `Registry<B>` (keyed on the block union, so a missing template is a compile error) |
| `src/errors.ts` | Tagged errors: `TemplateLoadError`, `RenderError`, `UnknownBlockType`, `StoreError`, `OutputError` |
| `src/TemplateLoader.ts` | `TemplateLoader` service, `TemplateModule` shape, `bundleLoader` (loads from a built server bundle) |
| `src/Marko.ts` | `Marko` service: `renderBlock`, `renderPage`, `patchPage`, `invalidateTemplates`; `makeMarkoLayer(config)` |
| `src/Store.ts` | `Store` service (where the admin writes) and `inMemoryStore` |
| `src/Output.ts` | `Output` service, `nodeOutput(dir)`, `memoryOutput`, path-traversal-safe `routeToFile` |
| `src/DepMap.ts` | Block to routes map and `affectedRoutes` for incremental builds |
| `src/Build.ts` | `buildAll`, `planPublish` (pure), `publish`, `renderPages` |
| `src/Server.ts` | `handle(request)`: document vs `text/marko-patch` negotiation, 404/500 mapping |
| `test/smoke.ts` | Stub-backed checks (see below) |

## Wiring (sketch)

```ts
const MarkoLive = makeMarkoLayer<MyBlock>({
  registry: { hero: { id: "hero" }, "product-grid": { id: "product-grid" } },
  pageTemplate: { id: "page" },
  pageStrategy: "dynamic-tags",          // "prerendered-html" for plain SSG
}).pipe(Layer.provide(bundleLoader((ref) => `${serverBundleDir}/${ref.id}.js`)))

const AppLive = Layer.mergeAll(MarkoLive, myStoreLayer, nodeOutput("dist"))

Effect.runPromise(buildAll.pipe(Effect.provide(AppLive)))
```

## What the smoke test covers

- Full build skips `mode: "ssr"` pages and isolates a page with an unknown block type (reported, others still written).
- `planPublish` returns `Incremental` / `StoreOnly` / `Full` correctly, including a block shared by an SSG and an SSR page.
- `publish` executes the plan and purges only what it wrote.
- `handle`: HTML for normal requests, a flush stream for `accept: text/marko-patch` with the `x-marko-patch` header passed through, 404, 500, trailing-slash normalization.
- `routeToFile` rejects `..` and backslash segments.
- A failed template load is not cached (a retry succeeds).

## Assumptions to check against real Marko (none verified)

1. `TemplateModule.renderToString(input): Promise<string>` is the right call on a compiled template.
2. `TemplateModule.patch(input, headers)` returns an async iterable of flush lines. Your branch's `template.patch(input, headers)` may return a stream or take different arguments.
3. The patch response `content-type` equals the request's `text/marko-patch`.
4. In `"dynamic-tags"` mode, a loaded template module can be used as a dynamic tag inside the page template, and the page template emits the `data-block-id` marker. Whether dynamic tags over differing block types pair on resume markers is the main open risk from `05-live-patches.md`.
5. How to enable the `patches` compiler option through `@marko/vite` (not wired here).

## Not built yet

- A compiler-based loader (only the built-bundle loader exists).
- Real HTTP server wiring and a publish endpoint (`handle` and `publish` are the building blocks).
- Persistent dependency map; it is rebuilt from the store on each publish.
- CDN purge (the `Output.purge` hook is a no-op in `nodeOutput`).
- Schema decoding at the store boundary (pass in your shared Effect Schemas).
