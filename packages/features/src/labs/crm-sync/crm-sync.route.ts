import { Array, Option, Order, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { toString as urlToString, type Url as UrlType } from "foldkit/url"

import { TAGS } from "../crm/crm.domain.ts"
import type { ActivityRecency } from "../crm/crm.model.ts"

// What the URL carries is decided by one question: could someone else
// meaningfully receive it? A filter is a question anyone can ask, and it
// survives being pasted into another session.
//
// Not the page number — with a continuously scrolling list a page is an artefact
// of how the data is fetched, not a position a reader can mean. Not the scroll
// offset either: row 1,200 of the recipient's results is a different contact,
// because their permissions and the data have both moved on. That is an answer
// specific to one session rather than a question.
export const CrmSyncListRoute = taggedStruct("CrmSyncList", {
    search: S.Option(S.String),
    // Comma-joined rather than repeated parameters, so one filter has one URL
    // and the key the page cache builds from it is stable.
    tags: S.Option(S.String),
    recency: S.Option(S.String),
})
export type CrmSyncListRoute = typeof CrmSyncListRoute.Type

// A contact is a thing anyone can be pointed at, so it goes in the path rather
// than being state the reader cannot share. Clicking a row pushes — the
// opposite of a search, and by the same test: Back should undo opening a
// contact, and should not undo refining a filter.
export const CrmSyncContactRoute = taggedStruct("CrmSyncContact", {
    contactId: S.String,
})
export type CrmSyncContactRoute = typeof CrmSyncContactRoute.Type

export const CrmSyncRoute = S.Union([CrmSyncListRoute, CrmSyncContactRoute])
export type CrmSyncRoute = typeof CrmSyncRoute.Type

export type CrmSyncBrowseFields = Readonly<{
    search: Option.Option<string>
    tags: Option.Option<string>
    recency: Option.Option<string>
}>

export const emptyCrmSyncBrowseFields: CrmSyncBrowseFields = {
    search: Option.none(),
    tags: Option.none(),
    recency: Option.none(),
}

const BASE = "/contacts/crm-sync"

export const crmSyncHref = () => `${BASE}/`

export const isCrmSyncPath = (pathname: string): boolean =>
    pathname === BASE ||
    pathname === `${BASE}/` ||
    pathname.startsWith(`${BASE}/`)

const maybeParam = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key)

    return value === null || value === "" ? Option.none() : Option.some(value)
}

const setQueryParam = (
    searchParams: URLSearchParams,
    key: string,
    maybeValue: Option.Option<string>
) => {
    Option.match(maybeValue, {
        onNone: () => undefined,
        onSome: (value) => searchParams.set(key, value),
    })
}

export const crmSyncBrowseFieldsFromRoute = (
    route: CrmSyncListRoute
): CrmSyncBrowseFields => ({
    search: route.search,
    tags: route.tags,
    recency: route.recency,
})

// An empty filter leaves the parameter off rather than writing search=, so the
// unfiltered list has one URL instead of two that mean the same thing.
export const crmSyncBrowseHref = (fields: CrmSyncBrowseFields) => {
    const searchParams = new URLSearchParams()

    setQueryParam(searchParams, "search", fields.search)
    setQueryParam(searchParams, "tags", fields.tags)
    setQueryParam(searchParams, "recency", fields.recency)

    const query = searchParams.toString()

    return query === "" ? `${BASE}/` : `${BASE}/?${query}`
}

export const searchTextFromRoute = (route: CrmSyncListRoute): string =>
    Option.getOrElse(route.search, () => "")

// A tag nobody has and a recency nobody offers both fall back to the default
// rather than producing a filter that matches nothing and reads as an empty
// dataset. Sorted, so the same two tags in either order are one cache entry.
export const tagIdsFromRoute = (
    route: CrmSyncListRoute
): ReadonlyArray<string> =>
    Option.match(route.tags, {
        onNone: (): ReadonlyArray<string> => [],
        onSome: (tags) =>
            Array.sort(
                Array.filter(tags.split(","), (tagId) =>
                    TAGS.some((tag) => tag.id === tagId)
                ),
                Order.String
            ),
    })

export const activityRecencyFromRoute = (
    route: CrmSyncListRoute
): ActivityRecency =>
    Option.match(route.recency, {
        onNone: (): ActivityRecency => "Any",
        onSome: (recency) =>
            recency === "SevenDays" || recency === "ThirtyDays"
                ? recency
                : "Any",
    })

export const tagsParamFor = (
    tagIds: ReadonlyArray<string>
): Option.Option<string> =>
    tagIds.length === 0
        ? Option.none()
        : Option.some(Array.join(Array.sort(tagIds, Order.String), ","))

export const recencyParamFor = (
    recency: ActivityRecency
): Option.Option<string> =>
    recency === "Any" ? Option.none() : Option.some(recency)

export const crmSyncContactHref = (contactId: string) =>
    `${BASE}/${encodeURIComponent(contactId)}`

// A trailing segment is a contact id; nothing after the base is the list. The
// list wins the bare path rather than being swallowed as a contact called "".
const contactIdFromPathname = (pathname: string): Option.Option<string> => {
    const trimmed = pathname.replace(/\/+$/, "")

    return trimmed.length > BASE.length && trimmed.startsWith(`${BASE}/`)
        ? Option.some(decodeURIComponent(trimmed.slice(BASE.length + 1)))
        : Option.none()
}

export const urlToCrmSyncRoute = (url: UrlType): CrmSyncRoute => {
    const browserUrl = new URL(urlToString(url))

    return Option.match(contactIdFromPathname(browserUrl.pathname), {
        onNone: () =>
            CrmSyncListRoute({
                search: maybeParam(browserUrl.searchParams, "search"),
                tags: maybeParam(browserUrl.searchParams, "tags"),
                recency: maybeParam(browserUrl.searchParams, "recency"),
            }),
        onSome: (contactId) => CrmSyncContactRoute({ contactId }),
    })
}
