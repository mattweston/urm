import { Array, Match as M, Option, pipe, Schema as S, String } from "effect"
import { taggedStruct } from "foldkit/schema"
import { toString as urlToString, type Url as UrlType } from "foldkit/url"

const Diet = S.Literals(["Carnivore", "Herbivore", "Omnivore"])
const Period = S.Literals(["Triassic", "Jurassic", "Cretaceous"])

export const SortColumn = S.Literals([
    "Name",
    "Period",
    "Diet",
    "Length",
    "Weight",
])
export type SortColumn = typeof SortColumn.Type

export const Unsorted = taggedStruct("Unsorted")
export const Ascending = taggedStruct("Ascending", { column: SortColumn })
export const Descending = taggedStruct("Descending", { column: SortColumn })
export const Sorting = S.Union([Unsorted, Ascending, Descending])
export type Sorting = typeof Sorting.Type

export const QuerySyncTableBrowseRoute = taggedStruct("QuerySyncTable", {
    search: S.Option(S.String),
    sorting: Sorting,
    diet: S.Option(Diet),
    period: S.Option(Period),
})

export const QuerySyncTableNotFoundRoute = taggedStruct(
    "QuerySyncTableNotFound",
    {
        path: S.String,
    }
)

export const QuerySyncTableRoute = S.Union([
    QuerySyncTableBrowseRoute,
    QuerySyncTableNotFoundRoute,
])

export type QuerySyncTableRoute = typeof QuerySyncTableRoute.Type

export type QuerySyncTableBrowseFields = Readonly<{
    search: Option.Option<string>
    sorting: Sorting
    diet: Option.Option<typeof Diet.Type>
    period: Option.Option<typeof Period.Type>
}>

export const emptyQuerySyncTableBrowseFields: QuerySyncTableBrowseFields = {
    search: Option.none(),
    sorting: Unsorted(),
    diet: Option.none(),
    period: Option.none(),
}

const SORT_PARAM_SEPARATOR = ":"
const SortDirection = S.Literals(["Ascending", "Descending"])
const decodeDiet = S.decodeUnknownOption(Diet)
const decodePeriod = S.decodeUnknownOption(Period)

const maybeParam = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key)

    return value === null || value === "" ? Option.none() : Option.some(value)
}

const decodeSorting = (maybeRaw: Option.Option<string>): Sorting => {
    const decodeColumn = S.decodeUnknownOption(SortColumn)
    const decodeDirection = S.decodeUnknownOption(SortDirection)

    return Option.match(maybeRaw, {
        onNone: () => Unsorted(),
        onSome: (value) => {
            const parts = String.split(value, SORT_PARAM_SEPARATOR)

            return pipe(
                Option.all({
                    column: pipe(
                        parts,
                        Array.get(0),
                        Option.flatMap(decodeColumn)
                    ),
                    direction: pipe(
                        parts,
                        Array.get(1),
                        Option.flatMap(decodeDirection)
                    ),
                }),
                Option.map(({ column, direction }) =>
                    M.value(direction).pipe(
                        M.when("Ascending", () => Ascending({ column })),
                        M.when("Descending", () => Descending({ column })),
                        M.exhaustive
                    )
                ),
                Option.getOrElse(() => Unsorted())
            )
        },
    })
}

const normalizeQuerySyncTablePathname = (pathname: string) =>
    pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname

const BASE = "/routing/query-sync-table"

export const isQuerySyncTablePath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const isQuerySyncTableRoute = (route: {
    _tag: string
}): route is QuerySyncTableRoute =>
    route._tag === "QuerySyncTable" || route._tag === "QuerySyncTableNotFound"

export const querySyncTableBrowseFieldsFromRoute = (
    route: QuerySyncTableRoute
): QuerySyncTableBrowseFields =>
    M.value(route).pipe(
        M.withReturnType<QuerySyncTableBrowseFields>(),
        M.tagsExhaustive({
            QuerySyncTable: ({ search, sorting, diet, period }) => ({
                search,
                sorting,
                diet,
                period,
            }),
            QuerySyncTableNotFound: () => emptyQuerySyncTableBrowseFields,
        })
    )

const encodeSorting = (sorting: Sorting): Option.Option<string> =>
    M.value(sorting).pipe(
        M.withReturnType<Option.Option<string>>(),
        M.tagsExhaustive({
            Unsorted: () => Option.none(),
            Ascending: ({ column }) =>
                Option.some(`${column}${SORT_PARAM_SEPARATOR}Ascending`),
            Descending: ({ column }) =>
                Option.some(`${column}${SORT_PARAM_SEPARATOR}Descending`),
        })
    )

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

export const querySyncTableBrowseHref = (
    fields: QuerySyncTableBrowseFields
) => {
    const searchParams = new URLSearchParams()

    setQueryParam(searchParams, "search", fields.search)
    setQueryParam(searchParams, "sorting", encodeSorting(fields.sorting))
    setQueryParam(searchParams, "diet", fields.diet)
    setQueryParam(searchParams, "period", fields.period)

    const query = searchParams.toString()

    return query === "" ? `${BASE}/` : `${BASE}/?${query}`
}

export const querySyncTableHref = () =>
    querySyncTableBrowseHref(emptyQuerySyncTableBrowseFields)

export const querySyncTableRouteTitle = (route: QuerySyncTableRoute) =>
    M.value(route).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            QuerySyncTable: () => "Query Sync Table",
            QuerySyncTableNotFound: () => "Query Sync Table",
        })
    )

export const urlToQuerySyncTableRoute = (url: UrlType): QuerySyncTableRoute => {
    const browserUrl = new URL(urlToString(url))
    const pathname = normalizeQuerySyncTablePathname(browserUrl.pathname)

    if (!isQuerySyncTablePath(pathname) || pathname !== BASE) {
        return QuerySyncTableNotFoundRoute({ path: pathname })
    }

    return QuerySyncTableBrowseRoute({
        search: maybeParam(browserUrl.searchParams, "search"),
        sorting: decodeSorting(maybeParam(browserUrl.searchParams, "sorting")),
        diet: pipe(
            maybeParam(browserUrl.searchParams, "diet"),
            Option.flatMap(decodeDiet)
        ),
        period: pipe(
            maybeParam(browserUrl.searchParams, "period"),
            Option.flatMap(decodePeriod)
        ),
    })
}
