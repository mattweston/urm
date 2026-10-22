# 01. Architecture

## Pieces

```
┌──────────────────┐   save/publish   ┌───────────────────┐
│ Foldkit admin SPA│ ───────────────▶ │  Content store    │
│ (edits blocks)   │                  │  pages, blocks    │
└──────────────────┘                  └─────────┬─────────┘
                                                │ "published" event
                                                ▼
                                      ┌───────────────────┐
                                      │ Build service     │
                                      │ (Effect, Node)    │
                                      │  - plan           │
                                      │  - render         │
                                      │  - write / purge  │
                                      └───┬───────────┬───┘
                                 SSG      │           │      SSR
                              ┌───────────▼──┐   ┌────▼───────────────┐
                              │ dist/ (HTML) │   │ Live server        │
                              │ + client JS  │   │ serves dist/ and   │
                              └───────┬──────┘   │ renders on demand  │
                                      │          └────┬───────────────┘
                                      ▼               ▼
                                   CDN / hosting ─▶ visitors
```

## Packages

| Package | Role | Depends on |
|---------|------|-----------|
| `@site/blocks` | Effect Schemas for every block type and the page shape. Shared by admin and generator. | `effect` |
| `@site/templates` | The `.marko` templates, one per block, plus layouts | `marko` |
| `effect-marko` | The Effect wrapper: `Marko` service, registry, build modes | `effect`, `@marko/vite` (or compiler) |
| `@site/admin` | Foldkit SPA, edits blocks, calls publish | `foldkit`, `@site/blocks` |
| `@site/server` | Effect HTTP server: publish endpoint, live SSR, patch endpoint | `effect-marko` |

Foldkit and the generator never import each other. They agree only through the schemas in `@site/blocks`.

## Data flow for a publish

1. Admin saves page or block data to the store, validated by the shared Schema.
2. Admin calls `POST /publish` with the changed ids.
3. The build service resolves which pages are affected (see `03-build-modes.md`).
4. It picks a strategy: incremental SSG, full SSG, or "store only" (SSR pages read fresh data next request).
5. It writes HTML, then purges CDN paths.

## Why Effect fits

- **Typed errors:** `TemplateCompileError`, `RenderError`, `StoreError` are distinct and reportable per page.
- **Layers:** swap the real `Marko` service for a stub in tests; swap file store for DB store.
- **Bounded concurrency:** `Effect.forEach(pages, render, { concurrency: 8 })`.
- **Resource safety:** `Effect.acquireRelease` around a Vite build or dev server.
- **Retries/schedules:** around store reads and CDN purge calls.
