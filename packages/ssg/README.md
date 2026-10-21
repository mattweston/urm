# @urm/ssg

Static site generation for publication sites. **Being replaced by SSR** — this
package is the thing being ported *from*, not a target to extend. Read this
before changing anything in `src/`.

**Not in the workspace.** Excluded by name in
[pnpm-workspace.yaml](../../pnpm-workspace.yaml): its `package.json` carries 5
`catalog:` references to the `urm-ts` workspace, and one unresolvable
`catalog:` entry fails `pnpm install` for the whole repo.

## What it does today

An immutable release snapshot in, a directory of HTML files out, deployed as its
own Cloudflare Worker.

```
ReleaseSnapshot ─ planRoutes ─ render each page (Foldkit, isHydratable: false)
                                    │
                             assembleDocument  (inject into an HTML template)
                                    │
                            validateStaticArtifact
                                    │
                    dist/builds/<domain_id>/<build_id>/  + BuildManifest
                                    │
                   Cloudflare.Website.StaticSite, assets only
```

| piece | file |
|---|---|
| snapshot decode | [src/snapshot.ts](src/snapshot.ts) |
| route planning, collision detection | [src/internal/route-planner.ts](src/internal/route-planner.ts), `output-path.ts` |
| build orchestration, canonical/meta/robots tags | [src/site-generator.ts](src/site-generator.ts) |
| page renderers (1,214 lines of Foldkit views) | `basic-renderer.ts`, `landing-renderer.ts`, `event-renderer.ts` |
| client behaviours (196 lines, bundled per build) | `src/client/event-details.client.ts`, `event-map.client.ts` |
| behaviour bundling via a programmatic Vite build | [src/site-behaviors.ts](src/site-behaviors.ts) |
| artifact write-out | [src/write-site-build.ts](src/write-site-build.ts) |
| deployment descriptor, worker naming | [src/deployment.ts](src/deployment.ts) |
| Cloudflare deploy | [src/preview-deployer.ts](src/preview-deployer.ts), [alchemy.run.ts](alchemy.run.ts) |

Two properties of this design drive the whole port:

**Every publish is a full rebuild.** `buildSite` renders every route with
`concurrency: 1`, bundles behaviours through a programmatic Vite build, writes
every file, then deploys. Changing one word in one page costs a complete
re-render, re-bundle and re-deploy of the site.

**Every site is its own Worker.** `deploymentWorkerName` mints
`urm-production-<owner>` / `urm-preview-<owner>` per domain or subdomain per
channel, and `deploymentResourceId` makes each one a distinct Alchemy resource.
N sites means N Workers, N deploys, N things to roll forward.

## Why SSR instead

Marko renders on request in a Worker, Convex is read over HTTP at request time,
and Cloudflare's CDN caches the result. No build step, no artifact directory, no
per-site deploy — one Worker serves every site, resolving the site from the
`Host` header.

The editor stops being a publishing pipeline and becomes a database write.

## Two findings that shape the port

### 1. The snapshot model is already orphaned

`src/snapshot.ts` decodes `SiteReleaseSnapshot` / `PublishedSitePage` from
`@urm/domain/schemas/document-site-builds`. **No table in the live Confect
schema references that module.** It is a generation behind: the current model is
`publication_*` plus `pages`, keyed by `domain_id` + optional `subdomain_id`,
with its own `PublicationReleaseSnapshot` under
`@urm/domain/schemas/publications`.

So this is not "port the renderers to a new transport" — the input schema itself
is stale. Do not port `snapshot.ts`.

### 2. The live schema is already indexed for request-time lookup

This is the part that makes the port cheap. [pages](../database/confect/tables/pages.ts)
carries exactly the indexes an SSR request needs:

| index | serves |
|---|---|
| `by_domain_id_and_subdomain_id_and_slug` | resolve a URL to a page |
| `by_domain_id_and_subdomain_id_and_is_homepage` | `/` |
| `by_domain_id_and_subdomain_id_and_order_position` | navigation |

Plus `domains.by_slug` and `subdomains.by_domain_id_and_slug` for resolving the
`Host` header, and `publication_layouts.by_domain_id_and_subdomain_id` for the
layout — one row, not a snapshot blob.

And `pages.publication_state` is already `"draft" | "published" | "archived"`.
Draft gating is a field on the live row, so **serving live data does not mean
serving unpublished data** — the thing releases existed to guarantee. That is
the single strongest argument that releases are no longer load-bearing for
correctness.

These indexes exist for point lookups, not batch export. The schema was already
shaped for the SSR model.

## Cache invalidation is the load-bearing decision

"Live" here means **no build step**, not a live subscription. The Convex HTTP
client is fresh per request; the CDN in front of it is what reintroduces
staleness, so a page is exactly as stale as its invalidation strategy allows.

Pick one deliberately, because the rest of the design hangs off it:

- **Purge on write.** A Convex mutation or action calls the Cloudflare purge API
  after a page, layout, blog post or nav item changes. Fast *and* fresh, and the
  option worth aiming at. Costs: the purge has to name the right URLs (so
  publishing a nav change means purging every page of that site), and a failed
  purge leaves a stale page with nothing to retry it. Prefer cache tags per
  site, so one purge call covers a whole site.
- **Short TTL with `stale-while-revalidate`.** Trivial to implement, bounded
  staleness, no coupling between the backend and Cloudflare's API. Costs a
  steady origin fetch rate and means edits are never instant.
- **Islands for the genuinely live parts.** Anything that must update without a
  navigation is a client island on the WebSocket client
  (`Confect.Client.layer`), not SSR output. Keeps the cached HTML cacheable.

These combine well: long TTL plus purge-on-write, with the TTL as the safety net
for a purge that never lands.

Whichever is chosen, write it down here once decided, and note that responses
must `vary` on `Host` — one Worker serving many sites shares one cache.

## Mapping

| today | under SSR |
|---|---|
| `ReleaseSnapshot` decode | `HttpClient` query per request, `pages` + `publication_layouts` |
| `planRoutes` + `outputPathFor` | request-time `Host` + path → `pages.by_..._slug` lookup |
| `validateStaticArtifact` | gone; nothing is written |
| `BuildManifest` | gone |
| `SiteBuildWriter`, `dist/builds/...` | gone |
| `site-behaviors.ts` Vite build | the app's normal client build; behaviours become Marko `client import` islands |
| `Cloudflare.Website.StaticSite` × N | one `Cloudflare.Worker`, many hosts |
| `page_template` string surgery for canonical/meta/robots | Marko template with `<head>` tags from the page row |
| `isHydratable: false` Foldkit render | a Marko template (see the renderer question below) |

## Does any of this survive HTTP-client SSR?

Almost none of it. The package does not get ported — it gets **harvested**, and
then it stops existing. Of ~2,800 lines of TypeScript plus 603 of CSS:

### Keep (~400 lines of TS, + all the CSS)

| file | why it survives |
|---|---|
| [src/site.css](src/site.css) | **Read, don't keep.** 603 lines of public-site styling — but it uses its own `--site-*` vocabulary and competes with the repo's `css/`, which is 5,278 layered lines over the shared 63-token palette. `css/` wins. Take its `@view-transition` block and its `color-scheme` handling, then drop it. |
| [src/site-theme.ts](src/site-theme.ts) | `renderSiteThemeCss` turns theme tokens into custom properties, including the `prefers-color-scheme: dark` block. Nothing about it is build-time. Feed it into Marko's `<html-style>`. |
| [src/site-layout.ts](src/site-layout.ts) | Header, nav, footer, skip link, `aria-current`, light/dark `<picture>` logo, and `public_url` rejecting non-`https` and credential-bearing URLs. Presentation decisions, not pipeline — though as Foldkit `HtmlBuilder` they need translating if step 1 picks Marko. |
| `src/client/*.client.ts` | 196 lines of event detail and map behaviour. Becomes a Marko `client import` island instead of a per-build Vite bundle; the logic carries over. |

Two things to salvage rather than keep whole:

- **Route rules** from [src/internal/output-path.ts](src/internal/output-path.ts):
  the reserved prefixes (`api`, `assets`, `sitegen`, `urm`), the segment pattern,
  and the rejection of `?`, `#`, `\`, `%` and `//`. These are slug rules, not
  artifact rules — they belong in `@urm/domain` beside `PageSlug`. The
  `→ index.html` half dies.
- **The invariant** in [src/internal/artifact-validator.ts](src/internal/artifact-validator.ts):
  it asserts the output carries no `data-foldkit-*` runtime markers and no
  undeclared `<script>`. That guarantee is still worth having — publication
  pages must never ship the admin runtime. It becomes a **test over rendered
  output**, not a build step.

### Delete (~1,200 lines)

`snapshot.ts`, `internal/route-planner.ts`, `internal/output-path.ts`,
`internal/document-assembler.ts`, `site-generator.ts`, `write-site-build.ts`,
`site-behaviors.ts`, `preview-deployer.ts`, `deployment.ts`, `errors.ts`,
`index.ts`, `alchemy.run.ts`, `scripts/`, `fixtures/`, and the tests covering
them. All of it exists to plan, write, validate and deploy files. With SSR
nothing is written.

`document-assembler.ts` is 15 lines wrapping one `injectIntoTemplate` call that
[apps/web/src/app/entry.server.ts](../../apps/web/src/app/entry.server.ts)
already makes — redundant either way.

### Undecided (1,214 lines)

The three renderers, pending step 1 below. That decision is the only reason this
package still has a meaningful amount of code in it.

### So: a package, but not this name

This section first concluded there was no package left. That followed from the
mistaken belief that keeping the renderers cost a client runtime; with that
corrected, the survivors are the stylesheet, the theme function, the layout
view, two islands **and** potentially 1,214 lines of renderers — a coherent
rendering package.

What it is not is a *static site generator*, so `ssg` has to go. The package
already names itself: six `site-*` modules, plus `SiteBuild`,
`SiteReleaseSnapshot`, `SiteDeploymentDescriptor`, `site_origin` and
`DomainSite-…` resource ids. Only the directory says `ssg`.

**Rename it `@urm/site`.** A "site" is precisely defined in `deployment.ts` as
`subdomain_id ?? domain_id` — a domain or one of its subdomains — which is the
unit `publication_layouts` is keyed by. It does not collide with the schema's
`publication_*` vocabulary: *publication* is the content and release model,
*site* is the thing rendered from it.

Do the rename when the port lands and the survivors are known, not before:
most of what is in here now is still scheduled for deletion.

## ⚠️ One guarantee that disappears in the port

[route-planner.ts](src/internal/route-planner.ts) enforces **route uniqueness**
at build time: it tracks `seenPaths` and `seenOutputs` and fails the build on a
duplicate route or output collision. A publish could not succeed with two pages
claiming one URL.

SSR has no such checkpoint, and **Convex indexes are not unique constraints** —
`pages.by_domain_id_and_subdomain_id_and_slug` will happily hold two published
rows with the same slug, and the request-time lookup would silently return
whichever comes first.

Move that check into the mutation that writes a page: reject a slug already
taken by a non-archived page for the same `domain_id` + `subdomain_id`. Do this
when writing the page-write mutations, not after; it is much harder to add once
duplicate slugs exist in the data.

## Proven by the theme spike (2026-10-12)

The read path in this plan is no longer hypothetical. `apps/web` now serves its
public pages with a palette read from Convex per request:

- `publications.siteAppearance` / `setSiteAppearance` in
  [packages/database](../database/confect/publications.spec.ts)
- `HttpClient` read in [apps/web/src/siteData.ts](../../apps/web/src/siteData.ts),
  fresh per request, falling back rather than failing the page
- `renderSiteThemeCss` harvested into
  [apps/web/src/siteTheme.ts](../../apps/web/src/siteTheme.ts) with the three
  name fixes (`--site-font-body` → `--font-body`, and the same for `-code` and
  `--site-radius`); zero `--site-*` properties remain in the output
- injected unlayered into Marko's `<html-style>`, which is what lets it beat
  `@layer tokens` without a specificity fight

Editing the theme in the Foldkit admin changes the next public request. No
build, no deploy. `color-scheme` is driven by the stored appearance, so the
no-flash property survives, and `system` emits both palettes plus the
`prefers-color-scheme` block.

What it did **not** prove, and what the TODO below still covers: host
resolution (the slug is hardcoded in two places), caching and invalidation
(there is none yet, so every request hits Convex), auth on the mutation, and
anything to do with pages, blog or events.

## TODO — porting to SSR

Ordered so each step is testable on its own.

### 1. Decide: Marko templates, or Foldkit rendered into Marko

The sharpest decision, and it is not obvious.

The renderers are 1,214 lines of Foldkit views built on `@urm/ui`, which is
itself 100% Foldkit. `apps/web` already proves Foldkit can be rendered to string
on the server and injected into a Marko shell — that is exactly what the `/app`
route does.

- **Keep them as Foldkit**, rendered non-hydratable into a Marko shell: reuses
  all 1,214 lines and all of `@urm/ui` as-is, and **ships no client JS**. A
  render with `isHydratable: false` is, in Foldkit's own words, "static markup
  that nothing will hydrate": it takes no build id and stamps no root, so no
  runtime is linked. This package's `artifact-validator.ts` asserted exactly
  that — no `data-foldkit-*` markers, no undeclared `<script>` — and every
  build passed it. The cost of this option is therefore `@urm/ui` in the
  workspace, not bytes on the page.
- **Rewrite as Marko templates**: ships near-zero JS, gets in-place patching
  between pages for free (see step 5), and matches why the public section of
  `apps/web` is Marko at all. Costs rewriting 1,214 lines and finding Marko
  equivalents for the `@urm/ui` components those views use.

Recommendation: no longer clear-cut, and it was only clear-cut while the
Foldkit option looked like it cost a runtime. Marko still wins on in-place
patching between a site's pages, which needs one Marko template and which
static files could never do. Foldkit wins on reusing 1,214 lines and
`@urm/ui` outright. A hybrid is legitimate: a Marko shell per site, with the
page body rendered statically by the existing Foldkit renderers.

### 2. Host resolution

New work; SSG never needed it, because a site *was* a deployment.

`Host` → `domain` (via `domains.by_slug`, or a hostname lookup) → optional
`subdomain` (`subdomains.by_domain_id_and_slug`). Add a Confect query for it,
and cache it hard — it changes far less often than content.

Decide how custom hostnames are handled: `deployment.ts` currently *requires* a
single generated `*.urm.dev` hostname in production, enforced by a schema
filter. One Worker serving many custom domains needs Cloudflare custom hostnames
or a route per domain, which is a different operational model.

### 3. A Confect read layer for public pages

`HttpClient.layer(url)` from `@confect/js` — it needs only `fetch`, so it works
in a Worker. Add public queries to `packages/database`:

- resolve host → site
- page by slug (filtered to `publication_state: "published"`)
- homepage
- navigation (`publication_navigation_items`, or `pages` by `order_position`)
- layout (`publication_layouts`, resolving the four image ids)
- the `blog` and `events` modules, gated on `publication_route_modules`
  (`PublicationRouteModuleId` is `["blog", "events"]`)

Keep these **public and unauthenticated** — the SSG package's own warning that
the generated site must not import authenticated staff functions still applies,
and it applies harder now that rendering happens in a live request.

### 4. The Worker

Follow [apps/web/src/worker.ts](../../apps/web/src/worker.ts), but note its
route table is a hardcoded `pageForPath` with a static `TITLES` record and a
synchronous `inputFor`. Publication routing is async and data-driven, so:

- resolve the site, then the page, then render
- `respondPublic` is currently sync and streams via `.toReadable()`. Either
  await the data then render, or stream the shell and let the data-dependent
  parts stream in — worth trying, since it is a real advantage over static files
- 404 when no page matches, and distinguish "no such site" from "no such page"

Decide whether this lives in `apps/web` or a second app. Separate is probably
right: publication sites are many-tenant and heavily cached, `apps/web` is
single-tenant with a `private, no-store` admin route.

### 5. Caching, and the patch win

Publication responses want the opposite headers from the admin route: public,
cacheable, with `vary` on `Host`. Pick a strategy from *Cache invalidation*
above and write it down in this README once chosen.

Then the upside SSG could never have: if all publication pages render from **one**
Marko template, they patch in place between each other, so navigating a site is
not a document load. Static files cannot do this. It depends on step 1 choosing
Marko, and on the one-template constraint — see
[apps/web/README.md](../../apps/web/README.md) for why patching cannot cross
templates.

### 6. Retire the publishing pipeline

Once SSR serves, decide what `publication_releases` and
`publication_deployments` are *for*. Options, in increasing ambition:

- keep releases as an audit trail of who published what when
- keep them as a rollback pointer: SSR reads "the content as of release X"
- drop them, and let `publication_state` be the whole publishing model

This is a product decision, not a technical one. Do not delete the tables until
it is made — they hold 29 and 57 documents respectively on the live deployment.

### 7. Harvest, then delete the package

Per *Does any of this survive* above: move the keepers out, drop the rest, and
remove this directory. The `@urm/domain` schemas under `document-site-builds`
and `document-site-deployments` go too, once nothing imports them.

Do this as a real deletion rather than leaving the package in place unused —
`packages/ssg` cannot be in the workspace while it carries `catalog:` refs, so
a half-retired version of it is invisible to typecheck and will rot.

## Also here

`printing.todo.md` and `security.todo.md` are from the `urm-ts` era and have not
been reviewed against this plan.

The existing test suite (9 files) covers the static pipeline — route planning,
artifact validation, manifest shape. Most of it tests behaviour that is being
deleted; `site-theme`, `site-layout` and the renderer tests are the ones worth
carrying forward in some form.
