import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { AirQuality } from "./air-quality.ts"
import { Place } from "./place.ts"
import { Forecast, Position } from "./weather.ts"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})
export const MovedMarker = taggedStruct("MovedMarker", { position: Position })
export const SucceededFetchForecast = taggedStruct("SucceededFetchForecast", {
    forecast: Forecast,
})
export const FailedFetchForecast = taggedStruct("FailedFetchForecast", {
    reason: S.String,
})
export const SucceededFetchAirQuality = taggedStruct(
    "SucceededFetchAirQuality",
    {
        airQuality: AirQuality,
    }
)
export const FailedFetchAirQuality = taggedStruct("FailedFetchAirQuality", {
    reason: S.String,
})
export const SucceededFetchPlace = taggedStruct("SucceededFetchPlace", {
    place: Place,
})
export const FailedFetchPlace = taggedStruct("FailedFetchPlace", {
    reason: S.String,
})

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    MovedMarker,
    SucceededFetchForecast,
    FailedFetchForecast,
    SucceededFetchAirQuality,
    FailedFetchAirQuality,
    SucceededFetchPlace,
    FailedFetchPlace,
])
export type Message = typeof Message.Type
