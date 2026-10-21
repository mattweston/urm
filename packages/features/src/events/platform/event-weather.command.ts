import { Clock, Effect, Match as M, Schema as S } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/http"
import { Command } from "foldkit"

import { EventWeatherFailed, EventWeatherLoaded } from "./app.message.ts"
import { EventWeather } from "./event-weather.model.ts"

const WEATHER_API = "https://api.open-meteo.com/v1/forecast"

class EventWeatherRequestError extends S.TaggedError<EventWeatherRequestError>()(
    "Events.EventWeatherRequestError",
    { reason: S.String }
) {}

const WeatherResponse = S.Struct({
    current: S.Struct({
        temperature_2m: S.Number,
        relative_humidity_2m: S.Number,
        wind_speed_10m: S.Number,
        weather_code: S.Number,
    }),
})

const weatherCodeToDescription = (code: number): string =>
    M.value(code).pipe(
        M.when(0, () => "Clear sky"),
        M.whenOr(1, 2, 3, () => "Partly cloudy"),
        M.whenOr(45, 48, () => "Foggy"),
        M.whenOr(51, 53, 55, () => "Drizzle"),
        M.whenOr(61, 63, 65, () => "Rain"),
        M.whenOr(66, 67, () => "Freezing rain"),
        M.whenOr(71, 73, 75, 77, () => "Snow"),
        M.whenOr(80, 81, 82, () => "Rain showers"),
        M.whenOr(85, 86, () => "Snow showers"),
        M.whenOr(95, 96, 99, () => "Thunderstorm"),
        M.orElse(() => "Unknown")
    )

export const LoadEventWeather = Command.define("LoadEventWeather", {
    args: {
        eventId: S.String,
        latitude: S.Number,
        longitude: S.Number,
    },
    messages: [EventWeatherLoaded, EventWeatherFailed],
    execute: ({ eventId, latitude, longitude }) =>
        Effect.gen(function* () {
            const client = yield* HttpClient.HttpClient
            const request = HttpClientRequest.get(WEATHER_API).pipe(
                HttpClientRequest.setUrlParams({
                    latitude: globalThis.String(latitude),
                    longitude: globalThis.String(longitude),
                    current:
                        "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                    temperature_unit: "celsius",
                    wind_speed_unit: "mph",
                })
            )
            const response = yield* client.execute(request)

            if (response.status !== 200) {
                return yield* Effect.fail(
                    new EventWeatherRequestError({
                        reason: `Open-Meteo answered ${response.status}.`,
                    })
                )
            }

            const data = yield* S.decodeUnknownEffect(WeatherResponse)(
                yield* response.json
            )
            const updated_at = yield* Clock.currentTimeMillis

            return EventWeatherLoaded({
                eventId,
                weather: EventWeather.make({
                    temperature: Math.round(data.current.temperature_2m),
                    description: weatherCodeToDescription(
                        data.current.weather_code
                    ),
                    humidity: data.current.relative_humidity_2m,
                    wind_speed: Math.round(data.current.wind_speed_10m),
                    updated_at,
                }),
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    EventWeatherFailed({
                        eventId,
                        error: "Current weather is unavailable.",
                    })
                )
            ),
            Effect.provideService(HttpClient.TracerPropagationEnabled, false),
            Effect.provide(FetchHttpClient.layer)
        ),
})
