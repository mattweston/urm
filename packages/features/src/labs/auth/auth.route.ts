import { pipe, Schema as S } from "effect"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { Url, type Url as UrlType } from "foldkit/url"

export const AuthHomeRoute = taggedStruct("AuthHome")
export const AuthLoginRoute = taggedStruct("AuthLogin")
export const AuthDashboardRoute = taggedStruct("AuthDashboard")
export const AuthSettingsRoute = taggedStruct("AuthSettings")
export const AuthNotFoundRoute = taggedStruct("AuthNotFound", {
    path: S.String,
})

export const LoggedOutRoute = S.Union([
    AuthHomeRoute,
    AuthLoginRoute,
    AuthNotFoundRoute,
])
export const LoggedInRoute = S.Union([
    AuthDashboardRoute,
    AuthSettingsRoute,
    AuthNotFoundRoute,
])
export const AuthRoute = S.Union([
    AuthHomeRoute,
    AuthLoginRoute,
    AuthDashboardRoute,
    AuthSettingsRoute,
    AuthNotFoundRoute,
])

export type LoggedOutRoute = typeof LoggedOutRoute.Type
export type LoggedInRoute = typeof LoggedInRoute.Type
export type AuthRoute = typeof AuthRoute.Type

const BASE = "/auth"

const authBaseRouter = pipe(
    Route.literal("labs"),
    Route.slash(Route.literal("auth"))
)

export const authHomeRouter = pipe(authBaseRouter, Route.mapTo(AuthHomeRoute))

export const authLoginRouter = pipe(
    authBaseRouter,
    Route.slash(Route.literal("login")),
    Route.mapTo(AuthLoginRoute)
)

export const authDashboardRouter = pipe(
    authBaseRouter,
    Route.slash(Route.literal("dashboard")),
    Route.mapTo(AuthDashboardRoute)
)

export const authSettingsRouter = pipe(
    authBaseRouter,
    Route.slash(Route.literal("settings")),
    Route.mapTo(AuthSettingsRoute)
)

const normalizeAuthPathname = (pathname: string) =>
    pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname

export const authRouteTitle = (route: typeof AuthRoute.Type) => {
    switch (route._tag) {
        case "AuthHome":
            return "Auth Home"
        case "AuthLogin":
            return "Auth Login"
        case "AuthDashboard":
            return "Auth Dashboard"
        case "AuthSettings":
            return "Auth Settings"
        case "AuthNotFound":
            return "Auth Not Found"
    }
}

const authRouteParser = Route.oneOf(
    authSettingsRouter,
    authDashboardRouter,
    authLoginRouter,
    authHomeRouter
)

const parseAuthRouteWithFallback = Route.parseUrlWithFallback(
    authRouteParser,
    AuthNotFoundRoute
)

export const urlToAuthRoute = (url: UrlType): AuthRoute =>
    parseAuthRouteWithFallback(
        Url.make({ ...url, pathname: normalizeAuthPathname(url.pathname) })
    )

export const isAuthPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const authHomeHref = () => `${BASE}/`
export const authLoginHref = () => `${BASE}/login/`
export const authDashboardHref = () => `${BASE}/dashboard/`
export const authSettingsHref = () => `${BASE}/settings/`

export const isAuthRoute = (route: { _tag: string }): route is AuthRoute =>
    route._tag === "AuthHome" ||
    route._tag === "AuthLogin" ||
    route._tag === "AuthDashboard" ||
    route._tag === "AuthSettings" ||
    route._tag === "AuthNotFound"
