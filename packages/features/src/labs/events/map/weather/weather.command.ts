import { Effect, Match as M, Schema as S, String } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http"
import { Command } from "foldkit"
import { FailedFetchWeather, SucceededFetchWeather } from "./weather.message.ts"
import { WeatherData } from "./weather.model.ts"

const POSTCODE_API = "https://api.postcodes.io/postcodes"
const WEATHER_API = "https://api.open-meteo.com/v1/forecast"

const PostcodeResult = S.Struct({
    postcode: S.String,
    latitude: S.Number,
    longitude: S.Number,
    admin_district: S.String,
    region: S.String,
})

const PostcodeResponse = S.Struct({
    status: S.Number,
    result: PostcodeResult,
})

const WeatherResponse = S.Struct({
    current: S.Struct({
        temperature_2m: S.Number,
        relative_humidity_2m: S.Number,
        wind_speed_10m: S.Number,
        weather_code: S.Number,
    }),
})

const FetchWeather = Command.define("FetchWeather", {
    args: { postcode: S.String },
    messages: [SucceededFetchWeather, FailedFetchWeather],
    execute: ({ postcode }) =>
        fetchWeatherEffect(postcode).pipe(
            Effect.provideService(HttpClient.TracerPropagationEnabled, false),
            Effect.provide(FetchHttpClient.layer)
        ),
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

export const fetchWeatherEffect = (postcode: string) =>
    Effect.gen(function* () {
        const trimmedPostcode = String.trim(postcode)

        if (String.isEmpty(trimmedPostcode)) {
            return yield* Effect.fail(
                FailedFetchWeather({ error: "Postcode required" })
            )
        }

        const client = yield* HttpClient.HttpClient

        const postcodeRequest = HttpClientRequest.get(
            `${POSTCODE_API}/${encodeURIComponent(trimmedPostcode)}`
        )
        const postcodeResponse = yield* client.execute(postcodeRequest)

        if (postcodeResponse.status !== 200) {
            return yield* Effect.fail(
                FailedFetchWeather({ error: "Postcode not found" })
            )
        }

        const postcodeData = yield* S.decodeUnknownEffect(PostcodeResponse)(
            yield* postcodeResponse.json
        )

        const weatherRequest = HttpClientRequest.get(WEATHER_API).pipe(
            HttpClientRequest.setUrlParams({
                latitude: postcodeData.result.latitude.toString(),
                longitude: postcodeData.result.longitude.toString(),
                current:
                    "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                temperature_unit: "celsius",
                wind_speed_unit: "mph",
            })
        )
        const weatherResponse = yield* client.execute(weatherRequest)

        if (weatherResponse.status !== 200) {
            return yield* Effect.fail(
                FailedFetchWeather({ error: "Failed to fetch weather data" })
            )
        }

        const weatherData = yield* S.decodeUnknownEffect(WeatherResponse)(
            yield* weatherResponse.json
        )

        return SucceededFetchWeather({
            weather: WeatherData.make({
                postcode: postcodeData.result.postcode,
                temperature: Math.round(weatherData.current.temperature_2m),
                description: weatherCodeToDescription(
                    weatherData.current.weather_code
                ),
                humidity: weatherData.current.relative_humidity_2m,
                windSpeed: Math.round(weatherData.current.wind_speed_10m),
                locationName: postcodeData.result.admin_district,
                region: postcodeData.result.region,
            }),
        })
    }).pipe(
        Effect.catchTag("FailedFetchWeather", (error) => Effect.succeed(error)),
        Effect.catch(() =>
            Effect.succeed(
                FailedFetchWeather({ error: "Failed to fetch weather data" })
            )
        )
    )

export const fetchWeather = (postcode: string) => FetchWeather({ postcode })
