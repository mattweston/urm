import { Option, pipe, Schema as S } from "effect"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { Url, type Url as UrlType } from "foldkit/url"

export const RoutingHomeRoute = taggedStruct("RoutingHome")
export const RoutingNestedRoute = taggedStruct("RoutingNested")
export const RoutingPeopleRoute = taggedStruct("RoutingPeople", {
    searchText: S.Option(S.String),
})
export const RoutingPersonRoute = taggedStruct("RoutingPerson", {
    personId: S.Number,
})
export const RoutingNotFoundRoute = taggedStruct("RoutingNotFound", {
    path: S.String,
})

export const RoutingRoute = S.Union([
    RoutingHomeRoute,
    RoutingNestedRoute,
    RoutingPeopleRoute,
    RoutingPersonRoute,
    RoutingNotFoundRoute,
])

export type RoutingRoute = typeof RoutingRoute.Type

const BASE = "/labs/learn/routing"

const routingBaseRouter = pipe(
    Route.literal("labs"),
    Route.slash(Route.literal("learn")),
    Route.slash(Route.literal("routing"))
)

export const routingHomeRouter = pipe(
    routingBaseRouter,
    Route.mapTo(RoutingHomeRoute)
)

export const routingNestedRouter = pipe(
    routingBaseRouter,
    Route.slash(Route.literal("nested")),
    Route.slash(Route.literal("route")),
    Route.slash(Route.literal("is")),
    Route.slash(Route.literal("very")),
    Route.slash(Route.literal("nested")),
    Route.mapTo(RoutingNestedRoute)
)

export const routingPeopleRouter = pipe(
    routingBaseRouter,
    Route.slash(Route.literal("people")),
    Route.query(S.Struct({ searchText: S.OptionFromOptional(S.String) })),
    Route.mapTo(RoutingPeopleRoute)
)

export const routingPersonRouter = pipe(
    routingBaseRouter,
    Route.slash(Route.literal("people")),
    Route.slash(Route.int("personId")),
    Route.mapTo(RoutingPersonRoute)
)

const routingRouteParser = Route.oneOf(
    routingPersonRouter,
    routingPeopleRouter,
    routingNestedRouter,
    routingHomeRouter
)

const parseRoutingRouteWithFallback = Route.parseUrlWithFallback(
    routingRouteParser,
    RoutingNotFoundRoute
)

const normalizeRoutingPathname = (pathname: string) =>
    pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname

export const urlToRoutingRoute = (url: UrlType): RoutingRoute =>
    parseRoutingRouteWithFallback(
        Url.make({ ...url, pathname: normalizeRoutingPathname(url.pathname) })
    )

export const isRoutingPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const isRoutingRoute = (route: {
    _tag: string
}): route is RoutingRoute =>
    route._tag === "RoutingHome" ||
    route._tag === "RoutingNested" ||
    route._tag === "RoutingPeople" ||
    route._tag === "RoutingPerson" ||
    route._tag === "RoutingNotFound"

export const routingHref = () => `${BASE}/`

export const routingNestedHref = () => `${BASE}/nested/route/is/very/nested/`

export const routingPeopleHref = (searchText: Option.Option<string>) =>
    Option.match(searchText, {
        onNone: () => `${BASE}/people/`,
        onSome: (value) =>
            `${BASE}/people/?searchText=${encodeURIComponent(value)}`,
    })

export const routingPersonHref = (personId: number) =>
    `${BASE}/people/${personId}/`

export const routingRouteTitle = (_route: RoutingRoute) => "Routing"
