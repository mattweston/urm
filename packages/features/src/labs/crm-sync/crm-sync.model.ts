import { Array, HashMap, Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { AsyncData } from "foldkit"

import {
    PAGE_SIZE,
    RemoteContactsPage,
    type RemoteContactRow,
} from "../crm-remote/crm-remote.domain.ts"
import { ActivityRecency } from "../crm/crm.model.ts"
import { SyncContactDetail } from "./crm-sync.domain.ts"

export const SyncContactsData = AsyncData.Schema(RemoteContactsPage, S.String)
export const SyncContactDetailData = AsyncData.Schema(
    S.Option(SyncContactDetail),
    S.String
)

// Where the page on screen came from. There is no "partly local" value on
// purpose: a half-filled store answers page 0 correctly and page 40 wrongly,
// and a total count over it is wrong without saying so.
export const ReadSource = S.Literals(["Remote", "Local"])
export type ReadSource = typeof ReadSource.Type

// Verifying is the step that earns the word seamless: the local copy is read
// back and compared against the page already on screen before it is trusted to
// serve anything.
export const HydrationState = S.Literals([
    "Hydrating",
    "Verifying",
    "Complete",
    "Failed",
])
export type HydrationState = typeof HydrationState.Type

export const LIST_ID = "crm-sync-contacts-list"
// Fixed, because the count-based window arithmetic below multiplies by it. The
// row layout has to hold this height whatever it is showing, including while a
// name is being edited, or the spacers and the rows disagree about where a row
// starts.
export const ROW_HEIGHT_PX = 96
export const LIST_OVERSCAN = 8

export const Model = S.Struct({
    // The input box. Distinct from activeSearchText because a keystroke changes
    // this immediately while the list is still showing the previous answer —
    // the list must not go blank between the keystroke and the debounce.
    searchText: S.String,
    // The search the rows on screen answer.
    activeSearchText: S.String,
    // The facets, which have no input/active split because a chip is one
    // deliberate click rather than a stream of them — there is nothing to
    // debounce, so the URL and the Model move together.
    activeTagIds: S.Array(S.String),
    activeRecency: ActivityRecency,
    // Keyed by search text and page, so a page scrolled back to is free and a
    // search returned to is already answered. The entry is source-agnostic on
    // purpose: verification proves both sources answer identically, so a page
    // cached from the network stays valid once the local copy takes over.
    // Without that proof the swap would have to empty the cache.
    pageByQueryKey: S.HashMap(S.String, SyncContactsData.schema),
    cacheKeysByRecency: S.Array(S.String),
    // The scroll position and container measurement. Pages stay the unit the
    // data is fetched, cached and verified in; this is the unit it is read in.
    list: Ui.VirtualList.Model,
    // Which contact the URL is showing, if any. The list Model above is not torn
    // down while this is set, which is the whole of how the reader's place is
    // kept: re-initialising it would lose the scroll position along with the
    // container measurement, and every return would land at the top.
    maybeSelectedContactId: S.Option(S.String),
    // Set when the reader leaves the list for a contact, cleared when the
    // container that comes back has been measured. The Model's scrollTop
    // survives the navigation; the DOM element does not, so the position has to
    // be pushed back into the new one.
    isListScrollPending: S.Boolean,
    // Keyed separately from the page cache, not folded into it: a detail is a
    // different shape answering a different question, and a contact's identity
    // has nothing to do with which page of which search it appeared on.
    detailByContactId: S.HashMap(S.String, SyncContactDetailData.schema),
    source: ReadSource,
    hydratedContacts: S.Number,
    hydrationState: HydrationState,
    // Set when verification finds local and remote disagreeing. The swap is
    // abandoned rather than shown, because a silent wrong answer is worse than
    // staying on the network.
    maybeMismatch: S.Option(S.String),
    remoteRequests: S.Number,
    localRequests: S.Number,
    maybeError: S.Option(S.String),

    // The write overlay, applied over whichever source produced the page. It is
    // deliberately not merged into either source's read: both must keep
    // answering identically or verification would compare a page carrying edits
    // against one that cannot know about them, and abandon a swap that was fine.
    editedNameByContactId: S.Record(S.String, S.String),
    // In flight, not yet confirmed. Separate from the overlay because the row
    // renders the new name either way — this only says whether it has landed.
    pendingWriteContactIds: S.Array(S.String),
    maybeEditingContactId: S.Option(S.String),
    editedName: S.String,
    maybeWriteError: S.Option(S.String),
})
export type Model = typeof Model.Type

export const MAX_CACHED_QUERY_PAGES = 24

// U+001F, the ASCII unit separator, which is exactly what it is for: a search
// box cannot produce one, so no filter can forge the key of another. `|` stays
// free for the page number appended after it.
const FILTER_SEPARATOR = "\u001f"

// A schema rather than a plain type, because commands carry it as an argument
// and `Command.define` decodes what it is given.
export const SyncFilterSchema = S.Struct({
    searchText: S.String,
    tagIds: S.Array(S.String),
    recency: ActivityRecency,
})
export type SyncFilter = typeof SyncFilterSchema.Type

export const filterOf = (model: Model): SyncFilter => ({
    searchText: model.activeSearchText,
    tagIds: model.activeTagIds,
    recency: model.activeRecency,
})

export const filterKeyOf = (filter: SyncFilter): string =>
    [filter.searchText, Array.join(filter.tagIds, ","), filter.recency].join(
        FILTER_SEPARATOR
    )

export const queryKeyFor = (filter: SyncFilter, page: number): string =>
    `${filterKeyOf(filter)}|${page}`

// What the cache inspector shows in place of a key nobody can read.
export const describeFilterKey = (queryKey: string): string => {
    const [searchText = "", tagIds = "", recency = ""] =
        queryKey.split(FILTER_SEPARATOR)
    const parts = [
        searchText === "" ? "no search" : `"${searchText}"`,
        tagIds === "" ? undefined : tagIds.split(",").join(" + "),
        recency === "SevenDays"
            ? "7 days"
            : recency === "ThirtyDays"
              ? "30 days"
              : undefined,
    ]

    return Array.join(
        Array.filter(parts, (part) => part !== undefined),
        " · "
    )
}

// Split at the last separator, not the first: the search text is user input and
// may itself contain one.
export const parseQueryKey = (
    queryKey: string
): Option.Option<{ readonly filterKey: string; readonly page: number }> => {
    const separatorIndex = queryKey.lastIndexOf("|")

    if (separatorIndex < 0) return Option.none()

    const page = Number(queryKey.slice(separatorIndex + 1))

    return Number.isInteger(page)
        ? Option.some({ filterKey: queryKey.slice(0, separatorIndex), page })
        : Option.none()
}

export const emptyModel = (): Model => ({
    searchText: "",
    activeSearchText: "",
    activeTagIds: [],
    activeRecency: "Any",
    // Empty, not seeded with a loading first page: nothing is read until the
    // URL says what to read, and a pre-seeded Loading entry would look like a
    // request already in flight and so never be asked for.
    pageByQueryKey: HashMap.empty(),
    cacheKeysByRecency: [],
    list: Ui.VirtualList.init({ id: LIST_ID, rowHeightPx: ROW_HEIGHT_PX }),
    maybeSelectedContactId: Option.none(),
    isListScrollPending: false,
    detailByContactId: HashMap.empty(),
    source: "Remote",
    hydratedContacts: 0,
    hydrationState: "Hydrating",
    maybeMismatch: Option.none(),
    remoteRequests: 0,
    localRequests: 0,
    maybeError: Option.none(),
    editedNameByContactId: {},
    pendingWriteContactIds: [],
    maybeEditingContactId: Option.none(),
    editedName: "",
    maybeWriteError: Option.none(),
})

type CacheEntry = typeof SyncContactsData.schema.Type

// Keys are inspected in recency order everywhere below, so "first" always means
// "most recently written".
const firstKeyWhere = (
    model: Model,
    predicate: (entry: CacheEntry, filterKey: string) => boolean
): Option.Option<string> =>
    Array.findFirst(model.cacheKeysByRecency, (queryKey) =>
        Option.match(parseQueryKey(queryKey), {
            onNone: () => false,
            onSome: ({ filterKey }) =>
                Option.match(HashMap.get(model.pageByQueryKey, queryKey), {
                    onNone: () => false,
                    onSome: (entry) => predicate(entry, filterKey),
                }),
        })
    )

const answeredKeyFor = (
    model: Model,
    filterKey: string
): Option.Option<string> =>
    firstKeyWhere(
        model,
        (entry, entryFilterKey) =>
            entryFilterKey === filterKey && AsyncData.hasData(entry)
    )

const filterKeyOfQueryKey = (queryKey: string): Option.Option<string> =>
    Option.map(parseQueryKey(queryKey), ({ filterKey }) => filterKey)

// The search the rows on screen answer, which is not always the one the URL
// asks for.
//
// A new search is a new query key, so for the moment before its first page
// lands there is no answered page to size the list from, and the list would
// have nothing to render but a spinner. Falling back to the last search that
// did answer keeps the previous result set on screen until the new one replaces
// it in a single frame. That is invisible once per search and the whole
// difference between usable and unusable once per keystroke.
//
// A failed search is exempt: it substitutes nothing and falls through to the
// error, because showing someone else's rows under a failure is worse than
// showing the failure.
export const displayedFilterKeyFor = (model: Model): string => {
    const active = filterKeyOf(filterOf(model))
    const isResolved =
        Option.isSome(answeredKeyFor(model, active)) ||
        Option.isSome(
            firstKeyWhere(
                model,
                (entry, entryFilterKey) =>
                    entryFilterKey === active && AsyncData.hasError(entry)
            )
        )

    if (isResolved) return active

    return Option.getOrElse(
        Option.flatMap(
            firstKeyWhere(model, (entry) => AsyncData.hasData(entry)),
            filterKeyOfQueryKey
        ),
        () => active
    )
}

// How many rows the scrollbar is sized for. Read out of the cache rather than
// stored beside it, so a total and the pages it counts cannot disagree: every
// page from either source carries it, and any answered page for the displayed
// search answers it.
export const totalMatchesFor = (model: Model): Option.Option<number> =>
    Option.flatMap(
        answeredKeyFor(model, displayedFilterKeyFor(model)),
        (queryKey) =>
            Option.flatMap(
                HashMap.get(model.pageByQueryKey, queryKey),
                (entry) =>
                    Option.map(
                        AsyncData.getData(entry),
                        (page) => page.totalMatches
                    )
            )
    )

export const itemCountFor = (model: Model): number =>
    Option.getOrElse(totalMatchesFor(model), () => 0)

// Option.none() until the container has been measured. The view renders a
// placeholder and waits for the first MeasuredContainer rather than guessing a
// height, which would resolve to a window and request pages nobody is looking at.
export const visibleWindowFor = (
    model: Model
): Option.Option<Ui.VirtualList.VisibleWindow> =>
    Ui.VirtualList.visibleWindow(model.list, itemCountFor(model), LIST_OVERSCAN)

// The rows the reader can actually see, with no overscan. Separate from
// visibleWindowFor because the position readout must not count the rows kept
// mounted either side of the viewport.
export const visibleRowsFor = (
    model: Model
): Option.Option<Ui.VirtualList.VisibleWindow> =>
    Ui.VirtualList.visibleWindow(model.list, itemCountFor(model), 0)

// The page holding the top of the window. It stands in for the old page number
// everywhere one is still needed: which page verification compares, which entry
// the cache inspector highlights, and where eviction measures distance from.
export const anchorPageFor = (model: Model): number =>
    Option.match(visibleWindowFor(model), {
        onNone: () => 0,
        onSome: ({ startIndex }) => Math.floor(startIndex / PAGE_SIZE),
    })

export const activeQueryKeyFor = (model: Model): string =>
    queryKeyFor(filterOf(model), anchorPageFor(model))

// A window spans at most two pages at the sizes this demo runs at, but the
// range is computed rather than assumed so a taller container or a smaller page
// stays correct.
export const pagesForWindow = (
    window: Ui.VirtualList.VisibleWindow
): ReadonlyArray<number> => {
    const firstPage = Math.floor(window.startIndex / PAGE_SIZE)
    const lastPage = Math.floor(
        Math.max(window.startIndex, window.endIndex - 1) / PAGE_SIZE
    )

    return Array.makeBy(
        lastPage - firstPage + 1,
        (offset) => firstPage + offset
    )
}

// The pages the current window needs. Unmeasured still asks for the first one:
// the list has to be filled before there is anything to measure against.
export const pagesForCurrentWindow = (model: Model): ReadonlyArray<number> =>
    Option.match(visibleWindowFor(model), {
        onNone: (): ReadonlyArray<number> => [0],
        onSome: pagesForWindow,
    })

// The page verification compares, and the entry the query-cache inspector
// marks as active. Everything reads through here rather than holding a second
// copy beside the cache, which would be the same data able to disagree with
// itself.
export const currentPageData = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, activeQueryKeyFor(model)),
        SyncContactsData.Idle
    )

// A row by its position in the whole result set, resolved through the page that
// holds it. None means the page has not arrived — the view renders a skeleton
// rather than collapsing the row, because the spacers are already sized for it.
export const rowAt = (
    model: Model,
    rowIndex: number
): Option.Option<RemoteContactRow> => {
    // The displayed search, not the active one: while a new search is in flight
    // these are the rows still on screen, and they have to keep resolving or
    // the list empties out under a total that says it should not.
    const queryKey = `${displayedFilterKeyFor(model)}|${Math.floor(rowIndex / PAGE_SIZE)}`

    return Option.flatMap(
        HashMap.get(model.pageByQueryKey, queryKey),
        (entry) =>
            Option.flatMap(AsyncData.getData(entry), (page) =>
                Array.get(page.rows, rowIndex % PAGE_SIZE)
            )
    )
}

// The one place the overlay is applied. Both sources return the server's name;
// this is what the screen shows instead when the row has been edited locally.
export const displayNameFor = (
    model: Model,
    contactId: string,
    name: string
): string => model.editedNameByContactId[contactId] ?? name

export const detailFor = (model: Model, contactId: string) =>
    Option.getOrElse(
        HashMap.get(model.detailByContactId, contactId),
        SyncContactDetailData.Idle
    )

export const isPendingWrite = (model: Model, contactId: string): boolean =>
    model.pendingWriteContactIds.includes(contactId)
