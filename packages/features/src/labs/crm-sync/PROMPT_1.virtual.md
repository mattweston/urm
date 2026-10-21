# Virtualise the `crm-sync` list in `apps/docs`

Replace the numbered-page UI with a continuously scrolling virtualised list,
while keeping pages as the **data** unit underneath.

`apps/docs` is an Astro app hosting Foldkit (Elm-architecture) islands. The demo
is `apps/docs/src/demo/crm-sync/`. Do this **before** the URL-sync task, because
it changes what the URL should encode.

## Why both, not either

Pages stay as the fetch/cache/verify unit for three reasons that are specific to
this demo:

- **Verification depends on a page.** The source swap is only safe because a
  page is compared row-for-row between the network and the local copy. A scroll
  window is defined by offset, so comparing would mean index-range equality plus
  exact count agreement — fuzzier, and that check is what makes the swap
  trustworthy.
- **The cache keys on `searchText|page`.** Range-keyed entries would need
  overlap and merge logic.
- **Pre-swap every read is a 280ms round trip.** A page is a sensible
  granularity to spend that on; a scroll position is not.

Presentation should still be a virtual list, because real CRMs scan rather than
page. Numbered pages are a data-layer artefact leaking into the UI.

## The key API finding — do not use `VirtualList.view`

`@foldkit/ui`'s packaged view takes a **dense** array:

```ts
export type ViewInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  ...
}>
```

That is why the `crm` demo can use it — it holds every contact id in the Model.
`crm-sync` loads pages lazily and must not allocate a `totalMatches`-sized array
per render (10k today, and the sibling demos go to 250k).

Use the count-based API instead and render the container yourself:

```ts
visibleWindow(model, itemCount, overscan)
//   => Option<{ startIndex, endIndex, topSpacerHeight, bottomSpacerHeight }>
```

`Option.none()` until the container is measured — render a placeholder and wait
for the first `MeasuredContainer` message. The spacer heights keep the scrollbar
physically correct; render a top spacer, the rows for `startIndex..endIndex`,
then a bottom spacer.

`itemCount` is already available: `totalMatches` comes back on every page from
both sources.

## The window → pages rule

With `PAGE_SIZE = 50` and a ~20-row window, a window spans at most two pages:

```
pagesForWindow = ⌊startIndex / PAGE_SIZE⌋ .. ⌊endIndex / PAGE_SIZE⌋
```

On every window change, ensure those pages are in the cache; request the missing
ones through the existing source-selection path. Rows for a page still loading
render as skeletons rather than collapsing the list — the spacers already keep
the geometry right, so a missing page must not change the scroll height.

## Wiring reference

`crm/` is the wiring reference (its _data layer_ is not — it holds everything in
the Model). Copy the submodel plumbing:

| file                   | what                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| `crm.model.ts:34,48`   | `list: Ui.VirtualList.Model` + `Ui.VirtualList.init({ id, rowHeightPx })` |
| `crm.message.ts:8`     | `GotVirtualListMessage` wrapping `Ui.VirtualList.Message`                 |
| `crm.update.ts:61,116` | `mapVirtualListCommands` + delegation to `Ui.VirtualList.update`          |
| `crm.subscription.ts`  | `Subscription.lift({ ... VirtualList.subscriptions.containerEvents })`    |

`crm-sync` has no subscriptions file yet — add one and wire it through
`demos.subscription.ts` the way `crm` is wired.

## Two things that will bite

**LRU eviction becomes window-aware.** The cache is bounded at
`MAX_CACHED_QUERY_PAGES = 24` and evicts purely by recency. A long scroll will
evict pages you are about to scroll back through. Eviction should prefer pages
far from the current window over least-recently-used.

**"Page 3 of 40" disappears** as a progress affordance. Replace it with a total
count plus the scrollbar; do not leave the user with no sense of position.

**A detail route is planned.** `VirtualList.Model` holds `scrollTop`, so a
return from a contact detail keeps the reader's place _provided the list
submodel is not torn down and re-`init`ed_. Put the list Model where it survives
that navigation, and use `scrollToIndex` / `ApplyScroll` to re-apply the
position when the list remounts. Getting this wrong is silent — every return to
the list simply lands at the top.

## Do not regress

- **Mutations**: optimistic rename with rollback, a `contact_edits` overlay
  table, edits surviving hydration and reload. The overlay is deliberately not
  merged into either source's read, so both keep answering identically and
  verification cannot produce a spurious mismatch.
- **Verification and the swap**: hydration completes → a verification read →
  only a row-for-row match flips the source to local. Do not let virtualisation
  change what is compared.
- **Query cache**: keyed `searchText|page`, source-agnostic because verification
  proves both sources agree.
- **Schema**: `contact_edits` was added via
  `IndexedDbDatabase.make(V1, …).add(V2, …)`. Another object store needs another
  version, or existing browsers throw "One of the specified object stores was
  not found".

29 existing tests across `test/crm-sync-{handover,cache,write}.test.ts`. Page-turn
tests (`RequestedNextSyncPage` / `RequestedPreviousSyncPage`) will need replacing
with window-change tests. Rework them to assert the new behaviour rather than
weakening them — and add one for "a window spanning two pages requests both".

## Conventions

- `.context/foldkit/skills/generate-program/` — `SKILL.md`, `architecture.md`,
  `conventions.md`, `checklist.md`, `blindSpots.md`. A snapshot; when they
  disagree with live source under `.context/foldkit/packages/`, live source wins.
- `update` is pure. Messages are verb-first past-tense facts. `M.tagsExhaustive`,
  never `switch`. No `as`, no `any`. 4-space indent.
- 25 lint rules in `oxlint-plugin-foldkit` are enforced, including
  `keyed-required-for-mapped-rows` — virtualised rows are mapped rows and need
  stable keys, or snabbdom patches the wrong row's handlers.

## Verifying

```
pnpm --filter docs typecheck
pnpm --filter docs exec vitest run
pnpm --filter docs exec oxlint src/demo/crm-sync test
```

- **Do not run the docs production build** — slow, heap-hungry, OOMs. Verify in
  the dev server.
- `pnpm lint` at the workspace root currently fails with ~40 pre-existing errors
  in `packages/ui-solid` (empty files), unrelated to this work.
- Tests drive `update` with Messages and never mount a container, so
  `visibleWindow` returns `Option.none()` in tests unless you feed a
  `MeasuredContainer` message first. Scroll behaviour itself needs the browser.
- Astro's `getStaticPaths` caches in dev; a new route can 404 until restart.

## Then

The URL-sync task follows this one. It encodes `?search=` (and, once the detail
route exists, the selected contact in the path) — not `?page=`, which stops
being meaningful once the list scrolls continuously, and not a scroll offset,
which is session state rather than something a recipient could use.
