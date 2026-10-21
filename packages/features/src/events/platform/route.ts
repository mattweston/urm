import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"

export const EventsRoute = taggedStruct("Events")
export const EventNewRoute = taggedStruct("EventNew")
export const EventRoute = taggedStruct("Event", { eventId: Schema.String })
export const EventEditRoute = taggedStruct("EventEdit", {
    eventId: Schema.String,
})
export const EventsMenuRoute = taggedStruct("EventsMenu")
export const EventsMenuNewRoute = taggedStruct("EventsMenuNew")
export const EventsMenuRouteItem = taggedStruct("EventsMenuRouteItem", {
    slug: Schema.String,
})
export const EventsMenuEditRoute = taggedStruct("EventsMenuEdit", {
    slug: Schema.String,
})
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([
    EventsRoute,
    EventNewRoute,
    EventRoute,
    EventEditRoute,
    EventsMenuRoute,
    EventsMenuNewRoute,
    EventsMenuRouteItem,
    EventsMenuEditRoute,
    NotFoundRoute,
])

export type AppRoute = typeof AppRoute.Type

const BASE = "/events"

const stripBase = (pathname: string) =>
    pathname === BASE || pathname === `${BASE}/`
        ? "/"
        : pathname.startsWith(BASE)
          ? pathname.slice(BASE.length)
          : pathname

export const urlToAppRoute = (pathname: string): AppRoute => {
    const next = stripBase(pathname)

    if (next === "/") {
        return EventsRoute()
    }

    if (next === "/new" || next === "/new/") {
        return EventNewRoute()
    }

    if (next.startsWith("/menu")) {
        const menuPath = next.slice("/menu".length) || "/"

        if (menuPath === "/" || menuPath === "") {
            return EventsMenuRoute()
        }

        if (menuPath === "/new" || menuPath === "/new/") {
            return EventsMenuNewRoute()
        }

        const menuSegments = menuPath.split("/").filter(Boolean)
        const slug = menuSegments[0] ?? ""

        if (slug.length === 0) {
            return NotFoundRoute({ path: pathname })
        }

        if (menuSegments[1] === "edit") {
            return EventsMenuEditRoute({ slug })
        }

        return EventsMenuRouteItem({ slug })
    }

    const segments = next.split("/").filter(Boolean)
    const eventId = segments[0] ?? ""

    if (eventId.length === 0) {
        return NotFoundRoute({ path: pathname })
    }

    if (segments[1] === "edit") {
        return EventEditRoute({ eventId })
    }

    return EventRoute({ eventId })
}

export const eventsHref = () => `${BASE}/`
export const eventNewHref = () => `${BASE}/new/`
export const eventHref = (eventId: string) => `${BASE}/${eventId}/`
export const eventEditHref = (eventId: string) => `${BASE}/${eventId}/edit/`
export const eventsMenuHref = () => `${BASE}/menu/`
export const eventsMenuNewHref = () => `${BASE}/menu/new/`
export const eventsMenuItemHref = (slug: string) => `${BASE}/menu/${slug}/`
export const eventsMenuItemEditHref = (slug: string) =>
    `${BASE}/menu/${slug}/edit/`

export const isAppScope = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)
