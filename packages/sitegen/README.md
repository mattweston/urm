# effect-marko: design notes

Design sketches for an `effect-marko` package: an Effect wrapper around Marko that turns block-based page data (edited in a Foldkit admin SPA) into a site, using SSG, SSR, or both.

Status: planning docs. Code blocks are untested sketches, not a working implementation.

## Files

| File | What it covers |
|------|----------------|
| `01-architecture.md` | The pieces, who owns what, data flow from admin to live site |
| `02-blocks-and-registry.md` | Block schemas (Effect Schema), the block-to-template registry, the `Marko` service |
| `03-build-modes.md` | Full SSG, incremental SSG, live SSR, how they share one render path |
| `04-client-side.md` | Carts and other client interactivity; whether Marko Run is required (it is not) |
| `05-live-patches.md` | The Marko patch protocol from your branch, and what it means for hosting, ownership, caching and the Effect wrapper |

## Key decisions so far

1. **The block is the unit**, not the framework. Blocks are data (Schema) plus a Marko template, so the same block can be baked at build time or rendered live.
2. **Foldkit is admin only.** It never renders the public site. `Runtime.embed` can run a Foldkit widget inside a page if ever useful (e.g. a live preview), but is not required.
3. **Marko Run is optional for bundling and hydration, but the patch protocol changes that picture.** `@marko/vite` alone covers bundling and hydration. Marko Run adds file-based routing and adapters (one adapter per build), and per your notes it also negotiates `text/marko-patch` and streams patch renders. Without it, the effect-marko server has to implement that transport (see `05-live-patches.md`).
4. **One render path.** `renderBlock`, `renderPage` and `patchPage` are the only functions that touch Marko. SSG, SSR and patch endpoints all call them.
5. **Patch renders need a live server.** A static host cannot answer `accept: text/marko-patch`. The plan is static HTML for first loads and the Effect server for navigations, which read the store at request time.

## Things I could not verify

- **Patch protocol details.** `05-live-patches.md` is built from the summary you pasted. I have not read `RESUMABILITY.md` or `CONTEXT.md` in your checkout, so API names and failure behaviour are as described, not checked.
- Exact `@marko/vite` build output layout for rendering from a built server bundle at build time. Check the `@marko/vite` README and its Express SSR example before committing to the build step.
- How `@marko/run-adapter-static` enumerates routes whose pages come from data.
- Marko version: you reported runtime-tags 6.4.4 and compiler 5.42.11, so this is Marko 6 (resume-based). Whether the `patches` option is in an upstream release or only in your branch is unknown.

## Sources

- [Marko + Vite](https://markojs.com/docs/vite)
- [@marko/vite README](https://github.com/marko-js/vite/blob/main/README.md)
- [Marko Run adapters](https://markojs.com/docs/marko-run/adapters)
- [Marko Run repo](https://github.com/marko-js/run)
- [Foldkit (Socket overview)](https://socket.dev/npm/package/foldkit/overview/0.141.1)
- [Compiler register hook discussion](https://github.com/marko-js/fastify/issues/5)
