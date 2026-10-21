# ADR-013: Registry items are `.ts`, source is the build input

The registry repo's source files live under `registry/default/` and are the input to the build pipeline (`scripts/build.mjs`: resolve-styles → shadcn build → token swap), which emits the flattened catalog + per-item JSON into `packages/registry/dist/r/` — the deploy copies it into the web assets. Imports use `@/` aliases (`@/lib/utils`, `@/components/ui/*`) so the CLI rewrites them per the user's `components.json` on install.
