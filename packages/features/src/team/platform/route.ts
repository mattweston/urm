import { Schema as S, pipe } from "effect"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const TeamRoute = taggedStruct("Team")
export const NotFoundRoute = taggedStruct("NotFound", { path: S.String })

export const AppRoute = S.Union([TeamRoute, NotFoundRoute])

export type AppRoute = typeof AppRoute.Type

const BASE = "/team"

const teamRouter = pipe(Route.literal("team"), Route.mapTo(TeamRoute))

export const urlToAppRoute = (pathname: string): AppRoute =>
    pathname === BASE || pathname === `${BASE}/`
        ? TeamRoute()
        : NotFoundRoute({ path: pathname })

export const teamHref = () => `${teamRouter()}/`

// The platform shell owns `/`, outside every feature's route table. Naming it
// here keeps the string in the one module that is allowed to spell routes.
export const platformRootHref = () => "/"

export const isAppScope = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)
