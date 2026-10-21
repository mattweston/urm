# AGENTS.md — start here

This file orients agents. Detailed specs live elsewhere. Read only what you need.

## orientation

- `docs/feature-map.md` is the high-level map. It covers intent, pipeline, component families, style token split, demo harness tricks, and gotchas. It documents what you will not find by grepping files.
- `CONTEXT.md` is the source of truth for glossary, ADR index, and repo orientation. ADRs live in `docs/adr/`.
- `docs/adr/` holds individual Architecture Decision Records (see `docs/adr/README.md` for the index).
- `docs/deriving-from-base.md` is the recipe for porting a component from upstream shadcn `bases/base/ui`. It has the state attribute table.
- `docs/shadcn-base-parity-audit.md` lists what still diverges from upstream. Check its status blockquote first.
- `CONTRIBUTING.md` has the short contribution loop and the two things that will bite you.

Read the feature map before exploring. The rest is on demand.

## quick rules

- Do not edit `packages/registry/styles/style-*.css`. Those are vendored and byte-identical to upstream.
- Do not inline resolved Tailwind in authored sources under `packages/registry/registry/default/ui/`. Author only `cn-*` tokens.
- Do not run bare `shadcn build`. Use `pnpm --filter @foldcn/registry run build`.
- Demo state is merged in `packages/web/src/demo/assemble.ts`. Style switching is live bindings via `packages/web/src/active-style.ts`.
