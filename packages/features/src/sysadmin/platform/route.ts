import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"

export const HomeRoute = taggedStruct("Home")
export const AuditRoute = taggedStruct("Audit")
export const LoggingRoute = taggedStruct("Logging")
export const TracingRoute = taggedStruct("Tracing")
export const MetricsRoute = taggedStruct("Metrics")
export const ErrorsRoute = taggedStruct("Errors")
export const SessionsRoute = taggedStruct("Sessions")
export const SystemRoute = taggedStruct("System")
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([
    HomeRoute,
    AuditRoute,
    LoggingRoute,
    TracingRoute,
    MetricsRoute,
    ErrorsRoute,
    SessionsRoute,
    SystemRoute,
    NotFoundRoute,
])
export type AppRoute = typeof AppRoute.Type

const BASE = "/sysadmin"

const stripBase = (pathname: string): string =>
    pathname === BASE || pathname === `${BASE}/`
        ? "/"
        : pathname.startsWith(BASE)
          ? pathname.slice(BASE.length)
          : pathname

export const urlToAppRoute = (pathname: string): AppRoute => {
    const next = stripBase(pathname)

    switch (next) {
        case "/":
            return HomeRoute()
        case "/audit/":
        case "/audit":
            return AuditRoute()
        case "/logging":
        case "/logging/":
            return LoggingRoute()
        case "/tracing":
        case "/tracing/":
            return TracingRoute()
        case "/metrics":
        case "/metrics/":
            return MetricsRoute()
        case "/errors":
        case "/errors/":
            return ErrorsRoute()
        case "/sessions":
        case "/sessions/":
            return SessionsRoute()
        case "/system":
        case "/system/":
            return SystemRoute()
        default:
            return NotFoundRoute({ path: next })
    }
}

export const auditHref = (): string => `${BASE}/audit/`
export const loggingHref = (): string => `${BASE}/logging/`
export const tracingHref = (): string => `${BASE}/tracing/`
export const metricsHref = (): string => `${BASE}/metrics/`
export const errorsHref = (): string => `${BASE}/errors/`
export const sessionsHref = (): string => `${BASE}/sessions/`
export const systemHref = (): string => `${BASE}/system/`

export const isAppScope = (pathname: string): boolean =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)
