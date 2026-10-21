# Add tag and activity-recency filters to the `crm-sync` demo in `apps/docs`

Bring `crm-sync` up to the facet set the other four CRM demos have: tag facets
and an activity-recency choice, alongside the text search it already does.

`apps/docs` is an Astro app hosting Foldkit (Elm-architecture) islands. The demo
is `apps/docs/src/demo/crm-sync/`.

**Sequence:** fourth, after virtualisation, URL sync and the detail route. It
builds on all three — the filter set becomes the cache key, it goes in the URL
beside `?search=`, and it has to be answerable by the local copy the detail
route taught to store activities.

## Why this demo has been text-only

`crm`, `crm-remote`, `crm-indexeddb` and `crm-normalized` all offer tag facets
and recency. `crm-sync` offers neither, and not by oversight: it is the only one
of the five where **two independent sources have to answer the same question
identically**, because the swap is only allowed once a page read back out of
IndexedDB matches the page on screen row for row.

Every filter added is therefore added twice — once to `serverSearch`, once to
`ReadSyncLocalPage` — and any disagreement between them, including ordering,
makes `verifyAgainstScreen` abandon the swap. That failure is quiet: the list
just stays on the network forever and the badge never flips. It is the single
thing most likely to go wrong in this task.

Today the two agree because they share one rule: `matchesAllTerms` /
`searchTermsFor` / `searchTokensFor` in `crm/crm.search.ts`, used by the index
writer, the local reader and the simulated server. **Extend that module rather
than writing the predicate twice.** A tag or recency rule that lives in two
files will drift.

## Semantics to match, not invent

The other demos already settled these, and a facet that means something
different here would be worse than no facet:

- **Tags are AND.** `contactMatchesSelectedTags` in `crm/crm.domain.ts` requires
  _every_ selected tag. `crm-remote`'s simulated query does the same.
- **Recency is one of three.** `SevenDays` / `ThirtyDays` / `Any`, mapping to
  7 / 30 / 999 days (`RECENCY_DAYS` in `crm.update.ts`), compared against
  `latestActivity.occurredDaysAgo`.
- **Tags canonicalise in the URL.** `crm-remote.route.ts` filters to known ids,
  dedupes and sorts before joining with commas, so two ways of picking the same
  two tags produce one URL — and so one cache entry.

## The local side has no index for either

This is the real cost. `contacts` indexes `contactIndex` and nothing else,
`tagIds` is a plain array on the row, and the `activities` store the detail
route added indexes `contactId` only. Neither facet is answerable without a
scan.

`crm-indexeddb` has exactly the stores to copy:

```ts
contact_tags     keyPath "id",  indexes { tagId, contactId }
contact_recency  keyPath "id",  indexes { occurredDaysAgo }
```

Its `queryContacts` also shows the intersection strategy: pull candidate ids per
facet from the indexes, intersect as ids, and only then fetch contact rows.
Reuse the shape — this demo already does the same thing for search tokens.

That is a **V4 migration**:

```ts
IndexedDbDatabase.make(V1, …).add(V2, …).add(V3, …).add(V4, …)
```

Object stores can only be created in a `versionchange` transaction. Skip the
version and browsers that have run the previous build throw "One of the
specified object stores was not found" — this has happened twice on this demo.
Follow V3's precedent and **reset the hydration cursor in the migration**:
contacts already written have no tag links or recency rows, so the fill has to
cover them again rather than resuming past them.

## `totalMatches` stops being free

`ReadSyncLocalPage`'s no-terms path returns `totalMatches: hydratedContacts` —
the whole store is the answer, so the cursor is the count. The moment a facet
narrows the set that shortcut is wrong, and it is wrong in the way this demo
cares about: the scrollbar would be sized for ten thousand rows over a result
set of two hundred, and `serverSearch` would disagree with it.

The local reader has to actually count matches once any facet is set.

## The cache key is the thing that will bite

The key is `` `${searchText}|${page}` `` (`queryKeyFor` / `parseQueryKey` in
`crm-sync.model.ts`), and three things parse it back apart:

| reader                                    | what it needs the key for                                      |
| ----------------------------------------- | -------------------------------------------------------------- |
| `totalMatchesFor`                         | find any answered page for the _active_ filter set             |
| `pageDistanceFrom` (`crm-sync.update.ts`) | window-aware eviction ranks same-filter pages by page distance |
| `cacheRow` (`crm-sync.view.ts`)           | the query-cache inspector's label                              |

Do not extend it by joining more fields with `|`. `parseQueryKey` splits at the
_last_ separator precisely because search text is user input and may contain
one; a four-field key with a free-text field in the middle cannot be parsed back
at all.

**Use the canonical filter query string as the key prefix.** `crmSyncBrowseHref`
already produces one canonical, sorted, deduped encoding of a filter set, and
the URL is already the source of truth — so key on `` `${filterQuery}|${page}` ``
with the page still last. One encoding, no second definition of "same filter
set", and the inspector can show the query string it is keyed by.

## Model and URL

`searchText` (the input box) and `activeSearchText` (what the rows answer)
generalise to a draft/active pair over the whole filter set. Keep the split —
it exists because the list must not go blank between a keystroke and the
debounce.

`ChangedSyncRoute` stays the only handler that resolves a filter into a read.
Its `searchText === model.activeSearchText` check becomes filter-set equality,
and the branch it guards — scroll back to the top, because the old offset means
nothing to a different result set — is already right for facets.

**Facet toggles are immediate; only text is debounced.** A click is not a
keystroke and there is nothing to wait for. Both still **replace** rather than
push: a facet is a refinement of the same view, and Back walking backwards
through every tag the reader tried on is exactly what replace is for. Follow
`crm-remote`'s `replaceFirstPage`.

The verification read passes `model.activeSearchText` today; it will need the
whole filter set, or hydration completing while a facet is set compares a
filtered page against an unfiltered one and abandons a swap that was fine.

## What does not change

Say so in the review rather than re-deriving it:

- **The window → pages rule.** `pagesForWindow` and `ensureWindowPages` are
  arithmetic over `startIndex`/`endIndex` and a row count. Filters change what
  the count is, not how a window maps to pages.
- **What verification compares.** Still one page, still row-for-row, still the
  page at the top of the window.
- **The detail route.** A contact is reached by id, which no filter narrows.

## Do not regress

- **Mutations**: optimistic rename with rollback, the `contact_edits` overlay
  table, edits surviving hydration and reload. The overlay is deliberately not
  merged into either source's read, so both keep answering identically and
  verification cannot produce a spurious mismatch. A facet must not change that:
  filter on what the source stores, apply the overlay at render.
- **Verification and the swap**: hydration completes → a verification read →
  only a row-for-row match flips the source to local.
- **Ordering**: local returns ids in index order and re-sorts by `contactIndex`
  before paging, because the server returns `contactIndex` order. Every new
  candidate-id path has to end in the same sort. Ordering is what breaks
  handovers.
- **The query cache**: LRU bounded at 24 with window-aware eviction, source-
  agnostic because verification proves both sources agree.

## Out of scope: the dataset-size picker

The other four demos have one; leave `crm-sync` without it. There, size is a
knob beside the filters. Here, changing it means discarding and re-hydrating the
entire local copy — which is what the existing "Reset local copy" button does —
and `TOTAL_CONTACTS` is load-bearing for hydration batching and the completion
check. If it is ever wanted, the honest form is a size choice _on the reset
action_, not a control that sits among the filters and looks like one.

## Conventions

- `.context/foldkit/skills/generate-program/` — `SKILL.md`, `architecture.md`,
  `conventions.md`, `checklist.md`, `blindSpots.md`. A snapshot; when they
  disagree with live source under `.context/foldkit/packages/`, live source wins.
- `update` is pure. Messages are verb-first past-tense facts. `M.tagsExhaustive`,
  never `switch`. No `as`, no `any`. 4-space indent.
- 25 lint rules in `oxlint-plugin-foldkit` are enforced, including
  `keyed-required-for-mapped-rows` — facet controls are mapped rows and need
  stable keys.
- **Known false positive:** `blindSpots.md` flags Command handlers returning
  `[model, []]`. Navigation commands legitimately have nothing to do on
  completion. Add a short comment rather than inventing work for them.

## Verifying

```
pnpm --filter docs typecheck
pnpm --filter docs exec vitest run
pnpm --filter docs exec oxlint src/demo/crm-sync test
```

61 crm-sync tests across `test/crm-sync-{handover,cache,write,window,url,detail}.test.ts`,
sharing `test/crm-sync-fixture.ts`. The fixture's `arriveAt` and `searchFor`
build a `CrmSyncListRoute` — widen them there and most of the rework is one
file. Worth a test each for: a facet toggle emitting a replace and the route
driving the state; two facet orders producing one cache entry; a filtered local
read counting matches rather than reporting the cursor; and a facet set at the
moment hydration completes still verifying cleanly.

- **Do not run the docs production build** — slow, heap-hungry, OOMs. Verify in
  the dev server (`pnpm --filter docs dev`, port 4324).
- Tests drive `update` with Messages and never open IndexedDB or mount a
  container, so they cannot catch the schema-version or the index-query
  problems. Check both in a browser that has **already run the previous build** —
  a fresh profile will not reproduce a missing object store.
- Astro's `getStaticPaths` caches in dev; a route change can 404 until restart.
