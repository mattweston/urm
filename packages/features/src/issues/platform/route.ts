import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"

export const IssuesRoute = taggedStruct("Issues")
export const IssueRoute = taggedStruct("Issue", { issueId: Schema.String })
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([IssuesRoute, IssueRoute, NotFoundRoute])
export type AppRoute = typeof AppRoute.Type

const LEGACY_BASE = "/issues/urm"
const ROOT_BASE = "/issues"

const normalizePathname = (pathname: string): string => {
    if (pathname === LEGACY_BASE || pathname === ROOT_BASE) {
        return "/"
    }

    if (pathname.startsWith(`${LEGACY_BASE}/`)) {
        return pathname.slice(LEGACY_BASE.length)
    }

    if (pathname.startsWith(`${ROOT_BASE}/`)) {
        return pathname.slice(ROOT_BASE.length)
    }

    return pathname
}

export const urlToAppRoute = (pathname: string) => {
    const nextPathname = normalizePathname(pathname)

    return nextPathname === "/"
        ? IssuesRoute()
        : nextPathname.startsWith("/")
          ? IssueRoute({ issueId: nextPathname.slice(1).split("/")[0] ?? "" })
          : NotFoundRoute({ path: nextPathname })
}

export const issuesHref = () => `${ROOT_BASE}/`
export const issueHref = (issueId: string) => `${ROOT_BASE}/${issueId}`

export const isAppScope = (pathname: string) =>
    pathname === ROOT_BASE ||
    pathname.startsWith(`${ROOT_BASE}/`) ||
    pathname === LEGACY_BASE ||
    pathname.startsWith(`${LEGACY_BASE}/`)
