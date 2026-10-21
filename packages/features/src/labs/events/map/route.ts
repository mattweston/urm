import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const IndexRoute = taggedStruct("Index")
export const InteractiveMapRoute = taggedStruct("InteractiveMap")
export const MapRoute = taggedStruct("Map")
export const JourneyRoute = taggedStruct("Journey")
export const IsochroneRoute = taggedStruct("Isochrone")
export const StorymapRoute = taggedStruct("Storymap")
export const WeatherRoute = taggedStruct("Weather")
export const WeatherMapRoute = taggedStruct("WeatherMap")
export const NotFoundRoute = taggedStruct("NotFound", { path: S.String })

export const AppRoute = S.Union([
    IndexRoute,
    InteractiveMapRoute,
    MapRoute,
    JourneyRoute,
    IsochroneRoute,
    StorymapRoute,
    WeatherRoute,
    WeatherMapRoute,
    NotFoundRoute,
])

export type AppRoute = typeof AppRoute.Type

const BASE = "/labs/events/map"

export const urlToAppRoute = (pathname: string): AppRoute => {
    const path = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    switch (path) {
        case BASE:
            return IndexRoute()
        case `${BASE}/interactive-map`:
            return InteractiveMapRoute()
        case `${BASE}/map`:
            return MapRoute()
        case `${BASE}/journey`:
            return JourneyRoute()
        case `${BASE}/isochrone`:
            return IsochroneRoute()
        case `${BASE}/storymap`:
            return StorymapRoute()
        case `${BASE}/weather`:
            return WeatherRoute()
        case `${BASE}/weather-map`:
            return WeatherMapRoute()
        default:
            return NotFoundRoute({ path: pathname })
    }
}

export const indexHref = () => `${BASE}/`
export const interactiveMapHref = () => `${BASE}/interactive-map/`
export const mapHref = () => `${BASE}/map/`
export const journeyHref = () => `${BASE}/journey/`
export const isochroneHref = () => `${BASE}/isochrone/`
export const storymapHref = () => `${BASE}/storymap/`
export const weatherHref = () => `${BASE}/weather/`
export const weatherMapHref = () => `${BASE}/weather-map/`
export const isAppScope = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)
