import { Effect, Match as M, Schema as S } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http"

import {
    WeatherData,
    WeatherRpcs,
    WeatherUnavailableError,
} from "@urm/contracts/events/weather"
import {
    AuthenticatedRequestContext,
    PublicWorkerRequestContext,
} from "@urm/contracts/auth-legacy"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { allowWeatherRequest } from "../../weather-rate-limit.ts"

const WEATHER_API = "https://api.open-meteo.com/v1/forecast"
const SUCCESS_STATUS_CODE = 200

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
        M.whenOr(45, 48, () => "Fog"),
        M.whenOr(51, 53, 55, () => "Drizzle"),
        M.whenOr(61, 63, 65, () => "Rain"),
        M.whenOr(66, 67, () => "Freezing rain"),
        M.whenOr(71, 73, 75, 77, () => "Snow"),
        M.whenOr(80, 81, 82, () => "Rain showers"),
        M.whenOr(85, 86, () => "Snow showers"),
        M.whenOr(95, 96, 99, () => "Thunderstorm"),
        M.orElse(() => "Unknown")
    )

const weatherUnavailable = () =>
    WeatherUnavailableError.make({ message: "Weather unavailable." })

const fetchCurrentWeather = (latitude: number, longitude: number) =>
    Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const weatherRequest = HttpClientRequest.get(WEATHER_API).pipe(
            HttpClientRequest.setUrlParams({
                latitude: globalThis.String(latitude),
                longitude: globalThis.String(longitude),
                current:
                    "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                temperature_unit: "celsius",
                wind_speed_unit: "mph",
            })
        )
        const weatherResponse = yield* client.execute(weatherRequest)

        if (weatherResponse.status !== SUCCESS_STATUS_CODE) {
            return yield* Effect.fail(weatherUnavailable())
        }

        const weatherData = yield* S.decodeUnknownEffect(WeatherResponse)(
            yield* weatherResponse.json
        )

        return WeatherData.make({
            temperature: Math.round(weatherData.current.temperature_2m),
            description: weatherCodeToDescription(
                weatherData.current.weather_code
            ),
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: Math.round(weatherData.current.wind_speed_10m),
        })
    }).pipe(
        Effect.catch(() => Effect.fail(weatherUnavailable())),
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.provide(FetchHttpClient.layer)
    )

const WeatherRpcHandlersLive = Effect.gen(function* () {
    const auth_persistence = yield* AuthPersistence

    const requireWeatherAllowance = (route: string, principal: string) =>
        allowWeatherRequest(route, principal).pipe(
            Effect.provideService(AuthPersistence, auth_persistence),
            Effect.filterOrFail(
                (allowed) => allowed,
                () => weatherUnavailable()
            ),
            Effect.asVoid
        )

    return WeatherRpcs.of({
        "weather.get_current": ({ latitude, longitude }) =>
            Effect.gen(function* () {
                const authenticated = yield* AuthenticatedRequestContext
                yield* requireWeatherAllowance(
                    "weather/authenticated/get_current",
                    authenticated.contactId
                )
                return yield* fetchCurrentWeather(latitude, longitude)
            }),
        "weather.public.get_current": ({ latitude, longitude }) =>
            Effect.gen(function* () {
                const public_worker = yield* PublicWorkerRequestContext
                yield* requireWeatherAllowance(
                    "weather/public/get_current",
                    public_worker.hostname
                )
                return yield* fetchCurrentWeather(latitude, longitude)
            }),
    })
})

export const WeatherRpcLive = WeatherRpcs.toLayer(WeatherRpcHandlersLive)
