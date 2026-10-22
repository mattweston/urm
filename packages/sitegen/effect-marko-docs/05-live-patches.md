# 05. Patch protocol and live updates

Source: the summary of your branch's patch protocol you pasted (runtime-tags 6.4.4, compiler 5.42.11). I have not read `RESUMABILITY.md:49` or `CONTEXT.md:262` in your checkout, so API names and failure behaviour below are as described, not checked. Where I infer something, it is marked **(inference)**.

Terms follow your glossary: "patch render", "flush", "shell", "held-shell token". I avoid "partial", "rerender" and "shell manifest".

## Correction to the earlier draft

I had guessed that persisted pages meant saving rendered HTML to disk and splicing block fragments into `dist/`. That was wrong. The protocol is request-driven navigation against a live, already-resumed page. The splice approach is dropped.

## The protocol, as described

- Behind the `patches` compiler option, a template can answer a navigation with a patch render instead of a new document. The server renders the same template and streams flushes that apply to the live page.
- The page persists: scopes, state, effects and DOM. The server refreshes only the values it owns.
- **Ownership.** Every write carries a mask of two bits per param group, client and server (`_set_scope_reason` / `_scope_reason`). A full page render writes whatever any contribution can change. A patch render writes server-owned holes as bare values and leaves client-owned structure to the resumed page, kept current through fills (`_fill_*` in `dom/signals.ts`). `translator/util/patch/` decides per binding whether a patch fills, writes, or leaves alone.
- Branch bodies whose expression depends on client state are stateful structure. Patch renders skip them and the resumed code handles them.
- **Wire format.** A flush is the shells it ships plus a nested tree of patches rooted at the page root. Scope ids never ride the wire. One flush is one line and one expression, applied as a unit; the commit check accepts or rejects it whole.
- **Shell.** A body the client can create without bundling its template (`id inits…!effects…;walks;template`), registered by the HTML module and shipped once per response. The request's `x-marko-patch` held-shell token says which shells the page already has.
- **Fallback.** Branches, loops, boundaries and children pair on their resume markers. Anything a matched build cannot pair throws and the caller does a full navigation.
- **Transport.** `template.patch(input, headers)` renders it. `@marko/run` negotiates `accept: text/marko-patch`, streams to `patch($global)`, and navigates on any failure.
- **Practical.** Flushes run through `new Function`, so the page needs `unsafe-eval` in its CSP. The apply side is tree-shaken per kind: `dom/patch.ts` dispatches by `PatchKey` into one `dom/patch-*.feat.ts` per kind.

## What this changes in the design

### 1. Patch renders need a live server

A static host cannot answer `accept: text/marko-patch`. The shape that fits:

```
first load  ─▶ static HTML from dist/ (SSG, fast, crawlable)
link click  ─▶ patch request ─▶ Effect server ─▶ store ─▶ template.patch ─▶ flush stream
failure     ─▶ full navigation (normal document)
```

Because patch renders read the store at request time, they are never stale. **(inference)** Incremental SSG then matters mainly for first loads, crawlers and visitors without the patch client. That makes the dependency map in `03-build-modes.md` less critical for freshness.

### 2. Ownership matches the block model

- Block props from the store are server-owned holes. A patch render refreshes them.
- Cart count, drawer open state, form input and similar are client-owned. They survive navigation because the page is never replaced.
- Template rule for block authors: put server data in plain holes; if a branch depends on client state, accept that patch renders skip it and the resumed page owns it.

### 3. One template per navigation target

The protocol re-renders the same template. **(inference)** Cross-page patching therefore wants the destination to use the same template as the current page. The simplest way to get that is one generic page template that renders the block list through the registry.

Risk to test early: a block list is a loop over varying block types (dynamic tags). Whether loops, branches and dynamic children over different block templates pair on resume markers is unknown. If they do not pair, the protocol throws and you get a full navigation. That degrades safely, but you lose the persistent page.

### 4. Marko Run and the transport

This corrects my earlier "Marko Run is not required" framing. For bundling and hydration it is still not required. For patch transport, the negotiation, streaming into `patch($global)` and failure fallback are described as things `@marko/run` does. Two options:

| Option | What you build | Trade-off |
|---|---|---|
| A. Marko Run hosts a catch-all route | One route that loads page data from the store; use its Node adapter for patch requests | Transport comes free; routing model is Marko Run's, adapter is one-per-build |
| B. Own transport in the Effect server | Client: fetch with `accept: text/marko-patch` plus `x-marko-patch`, pipe to the patch applier, `location.assign` on failure. Server: call `template.patch(input, headers)` and stream the result | Fits the `effect-marko` design; you own client-side glue and must track the branch |

Suggested spike before choosing: read how `@marko/run` wires `patch($global)` in your checkout and see how thin the transport is. If it is a small amount of code, option B is realistic.

### 5. Effect wrapper additions

```ts
// sketch, untested
export class Marko extends Context.Tag("Marko")<Marko, {
  readonly renderPage: (p: Page) => Effect.Effect<string, TemplateLoadError | RenderError>
  readonly patchPage: (
    p: Page,
    headers: Headers,        // must include x-marko-patch if sent
  ) => Stream.Stream<string, RenderError>  // one emitted chunk = one flush line
}>() {}
```

HTTP side: respond to requests with `accept: text/marko-patch` by streaming `patchPage`, and respond with an ordinary document otherwise. Input comes from route + store only, never from the request body.

Open items:
- How to switch on the `patches` compiler option through `@marko/vite` (babel or compiler options?) is not checked.
- Failure after the stream has started: the protocol says a flush is accepted or rejected whole, but I do not know what the client does if the stream dies between flushes. Test it.
- The held-shell token must reach `template.patch`. Do not strip `x-marko-patch` at a proxy or CDN.

### 6. Pushing updates to open pages

Nothing in the summary describes server push; patches are answers to navigations. For "admin publishes, open pages update" **(inference)** the client could re-request its current URL as a patch when it receives a lightweight SSE event, and let the normal patch render refresh the server-owned holes. Needs a test, including interaction with client-owned state.

### 7. Caching, CSP and safety

- Patch and document responses to the same URL differ by `Accept` and `x-marko-patch`. **(inference)** Send `Vary: Accept, x-marko-patch`, or keep patch responses out of the shared CDN cache.
- `unsafe-eval` is required on pages that apply patches. Scope it to the public site; keep the Foldkit admin on a strict CSP.
- Patch input is built server-side from the route and store. Never let the client choose the template or supply the input.

## Questions that are still open

1. Is the `patches` option in an upstream Marko release, or only in your branch? This decides how much fork drift you carry.
2. Does patching work across pages that share one generic block-list template?
3. What is the exact client apply API outside Marko Run (import path for `patch($global)`)?
4. What happens on a mid-stream failure after the first flush?
5. Is there any push mechanism, or is every patch a response to a request?

## Risks

- **Fork drift:** keep the branch behind the `Marko` service so swapping it touches one layer.
- **Concurrent edits:** serialize writes per route (an Effect `Semaphore` or per-route queue).
- **Stale static HTML:** a first load from `dist/` can predate a publish. Rebuild affected pages (see `03-build-modes.md`) and purge CDN paths after each write.
