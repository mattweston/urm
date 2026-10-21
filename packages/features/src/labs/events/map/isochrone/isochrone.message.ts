import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Band, TravelProfile } from "./isochrone.model.ts"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})

export const SucceededFetchBands = taggedStruct("SucceededFetchBands", {
    bands: S.Array(Band),
})
export const FailedFetchBands = taggedStruct("FailedFetchBands", {
    reason: S.String,
})

export const SelectedOrigin = taggedStruct("SelectedOrigin", {
    studioId: S.String,
})
export const SelectedProfile = taggedStruct("SelectedProfile", {
    profile: TravelProfile,
})

export const CompletedDrawBands = taggedStruct("CompletedDrawBands")
export const CompletedFlyToOrigin = taggedStruct("CompletedFlyToOrigin")

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    SucceededFetchBands,
    FailedFetchBands,
    SelectedOrigin,
    SelectedProfile,
    CompletedDrawBands,
    CompletedFlyToOrigin,
])

export type Message = typeof Message.Type
