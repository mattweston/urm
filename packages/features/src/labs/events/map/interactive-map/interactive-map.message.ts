import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { RouteProfile } from "./interactive-map.model.ts"
import { MapStyleId } from "./interactive-map.style.ts"
import { RouteGroupId } from "./interactive-map.studio.ts"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
    styleId: MapStyleId,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})

export const ClickedMarker = taggedStruct("ClickedMarker", {
    studioId: S.String,
})
export const ClickedStudio = taggedStruct("ClickedStudio", {
    studioId: S.String,
})
export const DismissedStudio = taggedStruct("DismissedStudio")
export const UpdatedSearchQuery = taggedStruct("UpdatedSearchQuery", {
    value: S.String,
})

// The original toggled a cookie named after each studio and let a
// MutationObserver notice; here an area going in or out of the route is one
// named thing that happens to one list.
export const AddedArea = taggedStruct("AddedArea", { areaId: RouteGroupId })
export const RemovedArea = taggedStruct("RemovedArea", { areaId: RouteGroupId })
export const ClearedAreas = taggedStruct("ClearedAreas")
export const SelectedRouteProfile = taggedStruct("SelectedRouteProfile", {
    profile: RouteProfile,
})
export const SelectedMapStyle = taggedStruct("SelectedMapStyle", {
    styleId: MapStyleId,
})
export const CompletedSetMapStyle = taggedStruct("CompletedSetMapStyle")

// Option, not a bare array: an absent key and a stored empty selection mean
// different things, and only the first should fall back to the default area.
export const LoadedSelection = taggedStruct("LoadedSelection", {
    maybeAreaIds: S.Option(S.Array(RouteGroupId)),
})
export const CompletedSaveSelection = taggedStruct("CompletedSaveSelection")
export const CompletedSyncMarkers = taggedStruct("CompletedSyncMarkers")

export const SucceededFetchRoute = taggedStruct("SucceededFetchRoute", {
    coordinates: S.Array(S.Tuple([S.Number, S.Number])),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})
export const FailedFetchRoute = taggedStruct("FailedFetchRoute", {
    reason: S.String,
})
export const CompletedDrawRoute = taggedStruct("CompletedDrawRoute")
export const CompletedClearRoute = taggedStruct("CompletedClearRoute")

export const DismissedGeolocate = taggedStruct("DismissedGeolocate")
export const SucceededGeolocate = taggedStruct("SucceededGeolocate", {
    lng: S.Number,
    lat: S.Number,
})
export const FailedGeolocate = taggedStruct("FailedGeolocate", {
    reason: S.String,
})

export const SucceededFlyTo = taggedStruct("SucceededFlyTo")
export const FailedFlyTo = taggedStruct("FailedFlyTo", { reason: S.String })

export const OpenedHelp = taggedStruct("OpenedHelp")
export const ClosedHelp = taggedStruct("ClosedHelp")

export const LoadedLocationNoticePreference = taggedStruct(
    "LoadedLocationNoticePreference",
    { isDismissed: S.Boolean }
)
export const ToggledSuppressLocationNotice = taggedStruct(
    "ToggledSuppressLocationNotice",
    { value: S.Boolean }
)
export const AcknowledgedLocationNotice = taggedStruct(
    "AcknowledgedLocationNotice"
)
export const CompletedSaveLocationNoticePreference = taggedStruct(
    "CompletedSaveLocationNoticePreference"
)

export const CompletedFocusSearchInput = taggedStruct(
    "CompletedFocusSearchInput"
)

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    ClickedMarker,
    ClickedStudio,
    DismissedStudio,
    UpdatedSearchQuery,
    AddedArea,
    RemovedArea,
    ClearedAreas,
    SelectedRouteProfile,
    SelectedMapStyle,
    CompletedSetMapStyle,
    LoadedSelection,
    CompletedSaveSelection,
    CompletedSyncMarkers,
    SucceededFetchRoute,
    FailedFetchRoute,
    CompletedDrawRoute,
    CompletedClearRoute,
    DismissedGeolocate,
    SucceededGeolocate,
    FailedGeolocate,
    SucceededFlyTo,
    FailedFlyTo,
    OpenedHelp,
    ClosedHelp,
    LoadedLocationNoticePreference,
    ToggledSuppressLocationNotice,
    AcknowledgedLocationNotice,
    CompletedSaveLocationNoticePreference,
    CompletedFocusSearchInput,
])

export type Message = typeof Message.Type
