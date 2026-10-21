import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { MapStyleId } from "./interactive-map.style.ts"
import {
    RouteGroupId,
    routeGroups,
    Studio,
    studios,
} from "./interactive-map.studio.ts"

// The three the original's profileSwitcher offered, and the three the
// Directions API routes for.
export const RouteProfile = S.Literals(["driving", "walking", "cycling"])

export type RouteProfile = typeof RouteProfile.Type

export const LngLat = S.Struct({
    lng: S.Number,
    lat: S.Number,
})

export type LngLat = typeof LngLat.Type

// The native GeolocateControl animates itself while it waits, so there is no
// "locating" state here to duplicate it — only the failure it cannot report.
export const GeolocateIdle = taggedStruct("GeolocateIdle")
export const GeolocateFailed = taggedStruct("GeolocateFailed", {
    reason: S.String,
})

export const GeolocateState = S.Union([GeolocateIdle, GeolocateFailed])

export type GeolocateState = typeof GeolocateState.Type

// The vanilla app had no equivalent of this: the directions plugin owned the
// request and only ever surfaced its result by redrawing itself, so nothing
// could say whether a route was in flight or why one had failed.
export const RouteIdle = taggedStruct("RouteIdle")
export const RouteLoading = taggedStruct("RouteLoading")
export const RouteLoaded = taggedStruct("RouteLoaded", {
    coordinates: S.Array(S.Tuple([S.Number, S.Number])),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})
export const RouteFailed = taggedStruct("RouteFailed", { reason: S.String })
// Areas hold between two and eleven studios each, and the Directions API takes
// at most 25 coordinates, so enough areas at once is a state the Model has to
// be able to be in rather than something to silently truncate.
export const RouteTooManyStudios = taggedStruct("RouteTooManyStudios", {
    count: S.Number,
})

export const RouteState = S.Union([
    RouteIdle,
    RouteLoading,
    RouteLoaded,
    RouteFailed,
    RouteTooManyStudios,
])

export type RouteState = typeof RouteState.Type

// Shown once per browser, mirroring the original's `do-not-show-again`
// localStorage flag, and only because geolocation needs OS-level permission
// that the page cannot ask for itself.
export const LocationNoticeChecking = taggedStruct("LocationNoticeChecking")
export const LocationNoticeVisible = taggedStruct("LocationNoticeVisible")
export const LocationNoticeHidden = taggedStruct("LocationNoticeHidden")

export const LocationNoticeState = S.Union([
    LocationNoticeChecking,
    LocationNoticeVisible,
    LocationNoticeHidden,
])

export type LocationNoticeState = typeof LocationNoticeState.Type

export const Model = S.Struct({
    studios: S.Array(Studio),
    searchQuery: S.String,
    maybeMapHostId: S.Option(S.String),
    maybeMapError: S.Option(S.String),
    // Some when the studio details panel is showing over the sidebar.
    maybeSelectedStudioId: S.Option(S.String),
    // Areas in the order they were added. An area being selected is also what
    // expands it in the sidebar, so there is no separate open/closed state to
    // drift out of step with the checkboxes.
    selectedAreaIds: S.Array(RouteGroupId),
    routeProfile: RouteProfile,
    mapStyleId: MapStyleId,
    routeState: RouteState,
    maybeUserLocation: S.Option(LngLat),
    geolocateState: GeolocateState,
    isHelpOpen: S.Boolean,
    locationNoticeState: LocationNoticeState,
    suppressLocationNotice: S.Boolean,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    studios,
    searchQuery: "",
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    maybeSelectedStudioId: Option.none(),
    selectedAreaIds: [],
    routeProfile: "driving",
    mapStyleId: "streets",
    routeState: RouteIdle(),
    maybeUserLocation: Option.none(),
    geolocateState: GeolocateIdle(),
    isHelpOpen: false,
    locationNoticeState: LocationNoticeChecking(),
    suppressLocationNotice: false,
}

export const SavedSelection = S.Struct({
    areaIds: S.Array(RouteGroupId),
})

export { routeGroups }
