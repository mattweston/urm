import { Effect } from "effect"
import { Command } from "foldkit"

import { current_air_quality } from "./air-quality.ts"
import {
    FailedFetchAirQuality,
    FailedFetchForecast,
    FailedFetchPlace,
    SucceededFetchAirQuality,
    SucceededFetchForecast,
    SucceededFetchPlace,
} from "./weather-map.message.ts"
import { nearest_place } from "./place.ts"
import { Position, current_weather } from "./weather.ts"

const FetchWeatherMapForecast = Command.define("FetchWeatherMapForecast", {
    args: { position: Position },
    messages: [SucceededFetchForecast, FailedFetchForecast],
    execute: ({ position }) =>
        current_weather(position).pipe(
            Effect.map((forecast) => SucceededFetchForecast({ forecast })),
            Effect.catch((error) =>
                Effect.succeed(FailedFetchForecast({ reason: error.reason }))
            )
        ),
})

const FetchWeatherMapAirQuality = Command.define("FetchWeatherMapAirQuality", {
    args: { position: Position },
    messages: [SucceededFetchAirQuality, FailedFetchAirQuality],
    execute: ({ position }) =>
        current_air_quality(position).pipe(
            Effect.map((airQuality) =>
                SucceededFetchAirQuality({ airQuality })
            ),
            Effect.catch((error) =>
                Effect.succeed(FailedFetchAirQuality({ reason: error.reason }))
            )
        ),
})

const FetchWeatherMapPlace = Command.define("FetchWeatherMapPlace", {
    args: { position: Position },
    messages: [SucceededFetchPlace, FailedFetchPlace],
    execute: ({ position }) =>
        nearest_place(position).pipe(
            Effect.map((place) => SucceededFetchPlace({ place })),
            Effect.catch((error) =>
                Effect.succeed(FailedFetchPlace({ reason: error.reason }))
            )
        ),
})

export const fetchReadings = (position: typeof Position.Type) => [
    FetchWeatherMapForecast({ position }),
    FetchWeatherMapAirQuality({ position }),
    FetchWeatherMapPlace({ position }),
]
