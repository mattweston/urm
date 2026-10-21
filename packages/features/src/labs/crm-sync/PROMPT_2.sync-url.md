# Add URL query sync to the `crm-sync` demo in `apps/docs`

Make the filtered view shareable: the search text lives in the query string, so
a filtered URL can be copied, reloaded, and walked with back/forward.

`apps/docs` is an Astro app hosting Foldkit (Elm-architecture) islands. The demo
is `apps/docs/src/demo/crm-sync/`.

> **Do the virtualisation task first.** It replaces numbered pages with a
> continuously scrolling list, which changes what the URL should encode. If it
> has not landed yet, read "If virtualisation has not happened yet" at the
> bottom.

## What goes in the URL

```
/urm/crm-sync/?search=ada     the filter
/urm/crm-sync/c-1234          a selected contact (a detail route is planned)
```

The rule these follow: **put in the URL what someone else could meaningfully
receive.** A filter is a question anyone can ask. A selected contact is a thing
anyone can be pointed at. Both survive being pasted into someone else's session.

**Not `?page=`.** Once the list scrolls continuously a page number is a
data-layer artefact, not a position a user can mean.

**Not a scroll offset.** `?row=1200` fails the same test — in a recipient's
session that is a different contact, because their results differ by permissions
and by whatever changed since. It is an answer specific to one session, not a
question.

If the detail route is not in scope for this task, do `?search=` only and leave
the path shape to the task that adds it.

## Scroll restoration — real, but not the URL's job

Returning to the list from a contact detail and finding your place is the core
CRM loop, so this does matter. It is not solved through the query string.

`VirtualList.Model` already holds `scrollTop`. If the list submodel is **not
torn down** while the detail view renders, the position survives in the Model on
its own — the work is re-applying it to the DOM when the list remounts, which is
what `scrollToIndex` and the `ApplyScroll` command are for. Keep the list Model
alive across the detail view rather than re-`init`ing it, and restoration is
close to free.

Getting this wrong is easy and silent: reinitialise the list on the way back and
every return to the list lands at the top.

## The design, and the evidence for it

`crm-remote` already does URL sync and is the pattern to port. The important
part is that **the URL is the source of truth**, not a mirror of Model state:

```ts
// crm-remote.update.ts:145
RequestedNextRemoteCrmPage: () => ... [model, [PushRemoteCrmUrl({ href: ... })]]
```

Note it returns the Model **unchanged**. The state change arrives back through
`ChangedRemoteCrmRoute`, which is the only handler that requests data. One
direction, so deep links and back/forward work by construction.

Port that shape. Do not write the URL _alongside_ a Model update — that is the
tempting shortcut and it double-fetches on back/forward.

## Files

**New:** `crm-sync/crm-sync.route.ts`, modelled on
`crm-remote/crm-remote.route.ts` (~140 lines, the closest reference):

```ts
export const CrmSyncRoute = r("CrmSync", {
    search: S.Option(S.String),
})
```

plus `emptyCrmSyncBrowseFields`, `crmSyncBrowseFieldsFromRoute`,
`crmSyncBrowseHref(fields)`, `urlToCrmSyncRoute(url)`. `BASE = "/urm/crm-sync"`.
Reuse `crm-remote`'s `maybeParam` / `setQueryParam` approach.

**Modified:**

| file                  | change                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `crm-sync.message.ts` | `ChangedSyncRoute` (carrying `CrmSyncRoute`), `CompletedSyncUrlReplacement`, `CompletedSyncUrlPush` |
| `crm-sync.update.ts`  | two `Command.define`s wrapping `Navigation.replaceUrl` / `pushUrl`; invert the handlers below       |
| `src/main.ts`         | a dispatch branch beside the `isCrmRemoteRouteTag` one at **line 158**                              |
| `src/route.ts`        | add `isCrmSyncRouteTag`; `CrmSyncRoute` (line 84) and `crmSyncHref` (line 1160) already exist       |

## The handlers to invert

`ElapsedSyncSearchDebounce` currently changes the Model and requests data
directly. It should emit a **replace** URL command and otherwise leave the Model
alone — typing must not fill history.

`ChangedSyncRoute` becomes the only place that resolves a search into data, and
should also resync `searchText` from the route so the input is correct on cold
load, back/forward, and any navigation the demo did not originate.

**Replace, not push.** A search is a refinement of the same view, not a
destination; pushing would make Back walk through every abandoned search term.

## Expect substantial test rework — this is the hidden cost

`test/crm-sync-{handover,cache,write}.test.ts` total 29 tests, and several assert
on what the _current_ flow does synchronously. "A search restarts at the first
page" asserts the Model moved immediately; under URL-driven flow it does not move
until `ChangedSyncRoute` arrives.

Rework them to drive the round trip — dispatch the interaction, assert a URL
command was emitted, feed the corresponding `ChangedSyncRoute`, then assert the
result. That is a better test of real behaviour, not a workaround.

Do not weaken an assertion to make it pass without first checking whether the
behaviour it describes should still hold.

## Do not regress

- **Mutations**: optimistic rename with rollback, a `contact_edits` overlay
  table, edits surviving hydration and reload. The overlay is deliberately not
  merged into either source's read, so both keep answering identically and
  verification cannot produce a spurious mismatch.
- **Verification and the swap**: hydration completes → verification read → only
  a row-for-row match flips the source to local.
- **Query cache**: keyed `searchText|page`, LRU-bounded, source-agnostic because
  verification proves both sources agree. It keys off Model state that the route
  now drives, so it needs no change.
- **Schema**: `contact_edits` was added via
  `IndexedDbDatabase.make(V1, …).add(V2, …)`. Another object store needs another
  version, or existing browsers throw "One of the specified object stores was
  not found".

## Conventions

- `.context/foldkit/skills/generate-program/` — `SKILL.md`, `architecture.md`,
  `conventions.md`, `checklist.md`, `blindSpots.md`. A snapshot; when they
  disagree with live source under `.context/foldkit/packages/`, live source wins.
- `update` is pure. Messages are verb-first past-tense facts. `M.tagsExhaustive`,
  never `switch`. No `as`, no `any`. 4-space indent.
- 25 lint rules in `oxlint-plugin-foldkit` are enforced.
- **Known false positive:** `blindSpots.md` flags Command handlers returning
  `[model, []]`. Navigation commands legitimately have nothing to do on
  completion — `crm-remote` does exactly this. Add a short comment rather than
  inventing work for it.

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
- Tests drive `update` with Messages and never touch the browser, so they cannot
  catch navigation problems. Check back/forward and a cold load of a filtered
  URL by hand.
- Astro's `getStaticPaths` caches in dev; a route change can 404 until restart.

## If virtualisation has not happened yet

Everything above holds except the URL shape: encode `?search=` and `?page=`, and
invert `RequestedNextSyncPage` / `RequestedPreviousSyncPage` to **push** (back
and forward should step through pages) while search stays **replace**.

Be aware you will migrate `?page=` away when virtualisation lands, which is why
the other order is cheaper.
