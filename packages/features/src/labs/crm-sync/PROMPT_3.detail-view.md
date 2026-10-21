# Add a contact detail route to the `crm-sync` demo in `apps/docs`

Open one contact at its own URL, with its tags and activity history, and return
to the list without losing your place.

`apps/docs` is an Astro app hosting Foldkit (Elm-architecture) islands. The demo
is `apps/docs/src/demo/crm-sync/`.

**Sequence:** this is third, after virtualisation and URL sync. It depends on
both — the list Model placement from the first, and the route module from the
second.

## The decision to make first

`crm-sync`'s local schema stores **only the latest activity**, not the history:

```ts
// crm-sync.database.ts
const SyncContactRow = S.Struct({
    ...Contact.fields,
    contactIndex: S.Number,
    tagIds: S.Array(S.String),
    latestActivity: Activity,   // ← singular
})
```

The remote source can produce the full history (`activitiesForContact` in
`crm/crm.generate.ts`); the local copy cannot. So a detail view showing activity
history has to resolve this, and the choice shapes the task:

**(a) Detail always reads remote.** Small change, no migration. But it breaks the
demo's whole premise — after the swap the list is local and instant while
opening a contact still costs a 280ms round trip, and the page is unusable
offline. Defensible only if you say so in the demo copy.

**(b) Add an `activities` table and hydrate it.** Consistent with the premise:
detail reads follow the same source as list reads, and work offline after the
swap. Costs a V3 migration and more hydration rows — which is _thematically
useful_, because it makes the cost of local-first visible rather than hiding it.

**(b) is the better demo**, and `crm-indexeddb` already has an `activities`
table with a `contactId` index to copy from. Take (a) only if you want the task
small; if you do, say which you chose and why in the demo's copy.

Either way the schema change needs a new version:

```ts
IndexedDbDatabase.make(V1, …).add(V2, …).add(V3, …)
```

Object stores can only be created in a `versionchange` transaction. Skip the
version and existing browsers throw "One of the specified object stores was not
found" — this has already happened once on this demo.

## Routing

The app router already has the list route. Add a param variant beside it,
following `routingPersonRouter` at `src/route.ts:879`:

```ts
const crmSyncContactRouter = pipe(
    appBase,
    Route.slash(Route.literal("crm-sync")),
    Route.slash(Route.string("contactId")),
    Route.mapTo(CrmSyncContactRoute)
)
```

Order matters — register it so `/crm-sync/` still matches the list rather than
being swallowed as a contact id.

The demo-local `crm-sync.route.ts` (added by the URL-sync task) gains the
contact variant, so `urlToCrmSyncRoute` returns either "list, filtered" or
"detail, this contact". Keep the URL-as-source-of-truth shape from that task:
clicking a row emits a **push** command, and the state change arrives back
through `ChangedSyncRoute`.

**Push, not replace** — a contact is a destination, and Back must return to the
list. This is the opposite of the search case, and the reason is the same test:
would a user expect Back to undo this?

## Scroll restoration — the thing this route exists to exercise

Returning to the list must land where you left it. In this architecture that is
mostly a matter of _not losing_ the position rather than restoring it:

- `VirtualList.Model` holds `scrollTop`. If the list submodel is **not torn down
  and re-`init`ed** while the detail renders, the position survives in the Model
  by itself.
- The DOM element does get recreated on return, so the position has to be pushed
  back into it — `scrollToIndex` / the `ApplyScroll` command exist for exactly
  this.

The failure is silent: re-`init` the list and every return lands at the top, with
nothing erroring and no test failing. Assert it explicitly.

## What the detail view shows

- the contact, with the **write overlay applied** — a locally renamed contact
  must show its edited name here too, via `displayNameFor`
- its tags, resolved from `tagIds` against the `TAGS` constant
- its activity history, newest first (subject to the decision above)
- the existing rename affordance; the detail page is a better home for it than
  the row, so consider moving rather than duplicating it
- a not-found state for an unknown id, following `crm-remote`'s
  `notFoundComponent`

## Do not regress

- **Mutations**: optimistic rename with rollback, the `contact_edits` overlay
  table, edits surviving hydration and reload. The overlay is deliberately not
  merged into either source's read, so both keep answering identically and
  verification cannot produce a spurious mismatch. A detail read must follow the
  same rule: read the source, apply the overlay at render.
- **Verification and the swap**: hydration completes → verification read → only
  a row-for-row match flips the source to local. A detail route must not change
  what is compared.
- **Query cache**: keyed `searchText|page`, LRU-bounded, source-agnostic. If you
  cache detail reads, key them separately — do not reuse the page cache.

## Conventions

- `.context/foldkit/skills/generate-program/` — `SKILL.md`, `architecture.md`,
  `conventions.md`, `checklist.md`, `blindSpots.md`. A snapshot; when they
  disagree with live source under `.context/foldkit/packages/`, live source wins.
- `update` is pure. Messages are verb-first past-tense facts. `M.tagsExhaustive`,
  never `switch`. No `as`, no `any`. 4-space indent.
- 25 lint rules in `oxlint-plugin-foldkit` are enforced, including
  `no-hardcoded-route-strings` — build hrefs by calling the router as a printer,
  never by string concatenation.
- **Known false positive:** `blindSpots.md` flags Command handlers returning
  `[model, []]`. Navigation commands legitimately have nothing to do on
  completion. Add a short comment rather than inventing work for them.

## Verifying

```
pnpm --filter docs typecheck
pnpm --filter docs exec vitest run
pnpm --filter docs exec oxlint src/demo/crm-sync test
```

Worth a test each for: opening a contact emits a push and the route drives the
state; an unknown id renders not-found; a locally renamed contact shows its
edited name on the detail page; and returning to the list preserves scroll.

- **Do not run the docs production build** — slow, heap-hungry, OOMs. Verify in
  the dev server.
- `pnpm lint` at the workspace root currently fails with ~40 pre-existing errors
  in `packages/ui-solid` (empty files), unrelated to this work.
- Tests drive `update` with Messages and never open IndexedDB or mount a
  container, so they cannot catch schema-version or scroll problems. Check both
  in a browser that has **already run the previous build** — a fresh profile
  will not reproduce a missing object store.
- Astro's `getStaticPaths` caches in dev; a new route can 404 until restart.
