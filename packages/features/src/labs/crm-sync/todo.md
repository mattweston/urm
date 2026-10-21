Why it can't become a feature — it can. Nothing here is demo-only; these demos are architecture templates. The gap to production is four things the demo fakes: a change feed with a version cursor (so hydration can't be overtaken by writes), a write path with conflict handling, permissions deciding what's allowed to land on the client, and storage-quota plus multi-tab coordination. Those are additions, not rewrites — the source-selection logic and the swap rule survive intact.

## docs

The key constraint
Both sources must apply the same matching rule, or swapping changes results under the user. So the simulated server matches word prefixes exactly as the local token index does — serverSearch runs the same matchesAllTerms over the generated dataset that the IndexedDB range query answers from. If the server did substring matching and local did prefix, verification would fail whenever hydration completed mid-search, and the swap would silently never happen.

That's the reason for the refactor you approved: searchTermsFor, searchTokensFor, and now matchesAllTerms live in crm/crm.search.ts, shared by crm-indexeddb and crm-sync. One rule, one definition, used by the index writer, the local reader, and the server.

What it does
Before the swap — each search is a 280 ms round trip.
After — a token prefix range per term, intersected, then one get per row on the page.
Debounced at 350 ms either way, using the same receipt-time guard: the timer carries the text that armed it and is dropped if the Model has moved on. It matters most here, since the pre-swap case is the worst in the whole demo set.
A new search resets to page 0 — the old offset means nothing to a different result set.

One detail worth naming: local search returns ids in token order, so the rows are re-sorted by contactIndex before paging. Without that, local and remote would return the same contacts in different orders — which the verification check treats as disagreement, correctly. Ordering is the thing that breaks handovers, and it now has to be right in two places rather than one.

Verification
4 new search tests on top of the 8 handover ones: a keystroke arming a timer rather than querying, a superseded timer being dropped, the page reset, and a post-swap search reading locally with no new network response. 301 tests pass in apps/docs; typecheck and lint clean across the workspace. crm-indexeddb's tokenizer tests moved with the code and still pass.
