import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const SucceededMountEventMap = taggedStruct("SucceededMountEventMap", {
    hostId: S.String,
})
export const FailedMountEventMap = taggedStruct("FailedMountEventMap", {
    reason: S.String,
})
export const PickedEventCoordinates = taggedStruct("PickedEventCoordinates", {
    lng: S.Number,
    lat: S.Number,
})

export const Message = S.Union([
    SucceededMountEventMap,
    FailedMountEventMap,
    PickedEventCoordinates,
])

export type Message = typeof Message.Type
