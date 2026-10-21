import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Coordinate } from "./journey.model.ts"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})

export const SucceededFetchJourney = taggedStruct("SucceededFetchJourney", {
    coordinates: S.Array(Coordinate),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})
export const FailedFetchJourney = taggedStruct("FailedFetchJourney", {
    reason: S.String,
})

export const ClickedPlay = taggedStruct("ClickedPlay")
export const ClickedReset = taggedStruct("ClickedReset")
export const CompletedDrawRoute = taggedStruct("CompletedDrawRoute")
export const CompletedJourney = taggedStruct("CompletedJourney")
export const CancelledJourney = taggedStruct("CancelledJourney")

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    SucceededFetchJourney,
    FailedFetchJourney,
    ClickedPlay,
    ClickedReset,
    CompletedDrawRoute,
    CompletedJourney,
    CancelledJourney,
])

export type Message = typeof Message.Type
