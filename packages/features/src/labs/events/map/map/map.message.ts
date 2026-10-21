import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Bounds } from "./map.model.ts"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})
export const MovedMap = taggedStruct("MovedMap", { bounds: Bounds })
export const ClickedMarker = taggedStruct("ClickedMarker", {
    locationId: S.String,
})
export const ClickedLocation = taggedStruct("ClickedLocation", {
    locationId: S.String,
})
export const UpdatedSearchQuery = taggedStruct("UpdatedSearchQuery", {
    value: S.String,
})
export const ClickedFindMe = taggedStruct("ClickedFindMe")
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
export const CompletedFocusSearchInput = taggedStruct(
    "CompletedFocusSearchInput"
)
export const CompletedLockBodyScroll = taggedStruct("CompletedLockBodyScroll")
export const CompletedUnlockBodyScroll = taggedStruct(
    "CompletedUnlockBodyScroll"
)

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    MovedMap,
    ClickedMarker,
    ClickedLocation,
    UpdatedSearchQuery,
    ClickedFindMe,
    DismissedGeolocate,
    SucceededGeolocate,
    FailedGeolocate,
    SucceededFlyTo,
    FailedFlyTo,
    CompletedFocusSearchInput,
    CompletedLockBodyScroll,
    CompletedUnlockBodyScroll,
])

export type Message = typeof Message.Type
