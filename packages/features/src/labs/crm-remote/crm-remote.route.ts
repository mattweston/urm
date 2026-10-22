import { Array, Option, pipe, Schema as S, String } from "effect"
import { taggedStruct } from "foldkit/schema"
import { toString as urlToString, type Url as UrlType } from "foldkit/url"

import { TAGS } from "../crm/crm.domain.ts"
import { ActivityRecency, DatasetSize } from "../crm/crm.model.ts"

export const CrmRemoteRoute = taggedStruct("CrmRemote", {
    search: S.Option(S.String),
    tags: S.Option(S.String),
    recency: ActivityRecency,
    size: DatasetSize,
    page: S.Number,
})
export type CrmRemoteRoute = typeof CrmRemoteRoute.Type

export type CrmRemoteBrowseFields = Readonly<{
    search: Option.Option<string>
    tags: Option.Option<string>
    recency: typeof ActivityRecency.Type
    size: typeof DatasetSize.Type
    page: number
}>

export const emptyCrmRemoteBrowseFields: CrmRemoteBrowseFields = {
    search: Option.none(),
    tags: Option.none(),
    recency: "Any",
    size: "TenThousand",
    page: 0,
}

const BASE = "/contacts/crm-remote"

export const crmRemoteHref = () => `${BASE}/`

export const isCrmRemotePath = (pathname: string): boolean =>
    pathname === BASE || pathname === `${BASE}/`
const decodeActivityRecency = S.decodeUnknownOption(ActivityRecency)
const decodeDatasetSize = S.decodeUnknownOption(DatasetSize)
const decodePage = S.decodeUnknownOption(S.FiniteFromString)
const isValidPage = (page: number) => Number.isInteger(page) && page >= 0

const maybeParam = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key)

    return value === null || value === "" ? Option.none() : Option.some(value)
}

const isKnownTagId = (tagId: string) => TAGS.some((tag) => tag.id === tagId)

const canonicalTagIds = (maybeTags: Option.Option<string>) =>
    pipe(
        maybeTags,
        Option.map((tags) =>
            pipe(
                String.split(tags, ","),
                Array.filter(isKnownTagId),
                Array.dedupe,
                Array.sort(String.Order)
            )
        ),
        Option.flatMap((tagIds) =>
            Array.match(tagIds, {
                onEmpty: () => Option.none(),
                onNonEmpty: () => Option.some(tagIds),
            })
        )
    )

export const selectedTagIdsFromRoute = (
    route: CrmRemoteRoute
): ReadonlyArray<string> =>
    pipe(
        canonicalTagIds(route.tags),
        Option.getOrElse((): ReadonlyArray<string> => [])
    )

export const crmRemoteBrowseFieldsFromRoute = (
    route: CrmRemoteRoute
): CrmRemoteBrowseFields => {
    const maybeTagIds = canonicalTagIds(route.tags)

    return {
        search: route.search,
        tags: pipe(
            maybeTagIds,
            Option.map((tagIds) => tagIds.join(","))
        ),
        recency: route.recency,
        size: route.size,
        page: route.page,
    }
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

export const crmRemoteBrowseHref = (fields: CrmRemoteBrowseFields) => {
    const searchParams = new URLSearchParams()

    setQueryParam(searchParams, "search", fields.search)
    setQueryParam(searchParams, "tags", fields.tags)
    searchParams.set("recency", fields.recency)
    searchParams.set("size", fields.size)
    searchParams.set("page", `${fields.page}`)

    return `${BASE}/?${searchParams.toString()}`
}

export const urlToCrmRemoteRoute = (url: UrlType): CrmRemoteRoute => {
    const browserUrl = new URL(urlToString(url))

    return CrmRemoteRoute({
        search: maybeParam(browserUrl.searchParams, "search"),
        tags: maybeParam(browserUrl.searchParams, "tags"),
        recency: pipe(
            maybeParam(browserUrl.searchParams, "recency"),
            Option.flatMap(decodeActivityRecency),
            Option.getOrElse(() => emptyCrmRemoteBrowseFields.recency)
        ),
        size: pipe(
            maybeParam(browserUrl.searchParams, "size"),
            Option.flatMap(decodeDatasetSize),
            Option.getOrElse(() => emptyCrmRemoteBrowseFields.size)
        ),
        page: pipe(
            maybeParam(browserUrl.searchParams, "page"),
            Option.flatMap(decodePage),
            Option.filter(isValidPage),
            Option.getOrElse(() => emptyCrmRemoteBrowseFields.page)
        ),
    })
}
