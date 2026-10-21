# ADR-007: `lucide` for icons, wrapped with `h.`

Uses vanilla `lucide` (not `lucide-react`). SVGs are wrapped via Foldkit's `h.svg` / `h.path` functions. Components that include icons (Select chevron, etc.) import from `lucide` and render via `h.`.
