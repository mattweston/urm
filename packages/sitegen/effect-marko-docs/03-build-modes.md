# 03. Build modes

All three modes call the same `Marko.renderPage`. They differ only in *when* and *where*.

## Mode A: full SSG

Render every page, write to `dist/`.

```ts
const buildAll = Effect.gen(function* () {
  const marko = yield* Marko
  const store = yield* Store
  const fs = yield* FileSystem.FileSystem
  const pages = yield* store.allPages
  yield* Effect.forEach(pages, (p) =>
    marko.renderPage(p).pipe(
      Effect.flatMap((html) => fs.writeFileString(outPath(p.route), html)),
      Effect.either, // collect per-page failures instead of aborting
    ),
    { concurrency: 8 },
  )
})
```

Use for: first deploy, template changes, layout changes, schema migrations.

## Mode B: incremental SSG

Keep a dependency map built during rendering:

```
blockId  → Set<route>        (which pages contain this block)
template → Set<route>        (which pages use this template)
dataKey  → Set<route>        (e.g. collection:shoes → pages with a product-grid on it)
```

On publish:

1. Collect changed ids (blocks, pages, data keys).
2. Union the affected routes from the map.
3. Re-render only those; write; purge those paths on the CDN.
4. Update the map (a block may have moved between pages).

Persist the map (file or store) so restarts do not force a full rebuild. If the map is missing or stale, fall back to Mode A.

A template or layout change affects every page that uses it, so it usually degrades to a full rebuild.

## Mode C: live SSR

A small Effect HTTP server in front of `dist/`:

```
request ─▶ static file in dist/?  ─ yes ─▶ serve it
                    │ no
                    ▼
          route marked dynamic?  ─ yes ─▶ store.page(route) ▶ Marko.renderPage ▶ HTML
                    │ no
                    ▼
                   404
```

Also expose block fragments for client swaps and patches:

```
GET /_blocks/:id   → renderBlock(block) as an HTML fragment
```

Mark a route dynamic in page data (`mode: "ssg" | "ssr"`), or by pattern (`/account/*`, `/search`). Because SSR uses the same templates, a block looks identical either way.

## Choosing per page

| Page kind | Mode | Why |
|-----------|------|-----|
| Marketing, blog, docs | SSG | Cacheable, cheapest |
| Product listing with frequently changing stock | SSG + incremental, or SSR | Depends how fresh it must be |
| Cart, checkout, account | SSR shell + client code | Per-user |
| Search | SSR | Query-dependent |

## Publish decision

```
changed = {blocks, pages, dataKeys, templates}
if templates or layouts changed      → full SSG
else if all affected pages are SSG   → incremental SSG
else                                  → store only; SSR picks it up
mixed                                 → incremental for SSG pages, store for SSR pages
```

## Patch navigations

See `05-live-patches.md`. Short version: patch renders need a live server (a static host cannot answer them) and read the store at request time, so they are never stale. Incremental SSG then matters mainly for first loads, crawlers and visitors without the patch client.

## Mixing with Marko Run (optional)

Marko Run chooses one adapter per build (static, Node, edge, etc.). If you adopt it, the simplest hybrid is two builds: one static, one Node, deployed behind a router. Per-route mixing inside one build was not something I found documented, so check before relying on it. The approach above (your own server plus `dist/`) does not depend on it.
