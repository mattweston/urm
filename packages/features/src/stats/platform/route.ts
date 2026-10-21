import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChartsRoute = taggedStruct("Charts")
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([ChartsRoute, NotFoundRoute])

export type AppRoute = typeof AppRoute.Type

const STATS_PATH = "/stats"

const matchesPath = (pathname: string, path: string) =>
    pathname === path || pathname === `${path}/`

export const urlToAppRoute = (pathname: string) =>
    matchesPath(pathname, STATS_PATH)
        ? ChartsRoute()
        : NotFoundRoute({ path: pathname })

export const statsHref = () => `${STATS_PATH}/`

export const isAppScope = (pathname: string) =>
    pathname === STATS_PATH || pathname.startsWith(`${STATS_PATH}/`)
