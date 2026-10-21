# ADR-003: Hosted registry with `@foldcn` namespace

Users configure `components.json` with `"@foldcn": "https://foldcn.elianiva.com/r/{name}.json"` and install via `shadcn add @foldcn/button`. Hosted on static hosting (Cloudflare Pages / Vercel / GitHub Pages) — built with `shadcn build`, zero server logic.
