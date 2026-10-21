import { Data, Effect, Schema as S } from "effect"

const FORECAST_API = "https://api.open-meteo.com/v1/forecast"

export const Position = S.Struct({ lng: S.Number, lat: S.Number })
export type Position = typeof Position.Type

export const CurrentWeather = S.Struct({
    temperature: S.Number,
    feels_like: S.Number,
    description: S.String,
    is_day: S.Boolean,
    humidity: S.Number,
    precipitation: S.Number,
    cloud_cover: S.Number,
    pressure: S.Number,
    wind_speed: S.Number,
    wind_gusts: S.Number,
    wind_bearing: S.Number,
    wind_compass: S.String,
})
export type CurrentWeather = typeof CurrentWeather.Type

export const DailyOutlook = S.Struct({
    high: S.Number,
    low: S.Number,
    sunrise: S.String,
    sunset: S.String,
    uv_index_max: S.optional(S.Number),
    precipitation_chance: S.optional(S.Number),
})
export type DailyOutlook = typeof DailyOutlook.Type

// Elevation and timezone ride along in every forecast response whether or not
// they are asked for, so the point's altitude and clock cost nothing extra.
export const Forecast = S.Struct({
    current: CurrentWeather,
    today: DailyOutlook,
    elevation_metres: S.Number,
    timezone: S.String,
})
export type Forecast = typeof Forecast.Type

export class WeatherError extends Data.TaggedError("WeatherError")<{
    readonly reason: string
}> {}

const ForecastResponse = S.Struct({
    elevation: S.Number,
    timezone: S.String,
    current: S.Struct({
        temperature_2m: S.Number,
        apparent_temperature: S.Number,
        is_day: S.Number,
        relative_humidity_2m: S.Number,
        precipitation: S.Number,
        cloud_cover: S.Number,
        pressure_msl: S.Number,
        wind_speed_10m: S.Number,
        wind_gusts_10m: S.Number,
        wind_direction_10m: S.Number,
        weather_code: S.Number,
    }),
    daily: S.Struct({
        sunrise: S.Array(S.String),
        sunset: S.Array(S.String),
        // Null outside the range the model covers, so not merely absent.
        uv_index_max: S.Array(S.NullOr(S.Number)),
        precipitation_probability_max: S.Array(S.NullOr(S.Number)),
        temperature_2m_max: S.Array(S.Number),
        temperature_2m_min: S.Array(S.Number),
    }),
})

const CURRENT_FIELDS = [
    "temperature_2m",
    "apparent_temperature",
    "is_day",
    "relative_humidity_2m",
    "precipitation",
    "cloud_cover",
    "pressure_msl",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "weather_code",
].join(",")

const DAILY_FIELDS = [
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_probability_max",
    "temperature_2m_max",
    "temperature_2m_min",
].join(",")

const COMPASS: ReadonlyArray<string> = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
]

// Sixteen points of 22.5°, offset by half a step so each label is centred on
// its own arc rather than starting at it.
const compass_point = (bearing: number): string =>
    COMPASS[Math.round(bearing / 22.5) % 16] ?? "N"

const weather_code_to_description = (code: number): string => {
    if (code === 0) return "Clear sky"
    if (code <= 3) return "Partly cloudy"
    if (code === 45 || code === 48) return "Foggy"
    if (code >= 51 && code <= 57) return "Drizzle"
    if (code >= 61 && code <= 67) return "Rain"
    if (code >= 71 && code <= 77) return "Snow"
    if (code >= 80 && code <= 82) return "Rain showers"
    if (code >= 85 && code <= 86) return "Snow showers"
    if (code >= 95) return "Thunderstorm"
    return "Unknown"
}

// The API returns these already in the point's own timezone because the request
// asks for timezone=auto, so the clock time is sliced off rather than parsed:
// building a Date here would re-read them in the browser's timezone and show
// sunrise in the wrong one.
const clock_time = (timestamp: string | undefined): string =>
    timestamp?.slice(11, 16) ?? "—"

const forecast_url = ({ lng, lat }: Position): string => {
    const url = new URL(FORECAST_API)

    url.searchParams.set("latitude", `${lat}`)
    url.searchParams.set("longitude", `${lng}`)
    url.searchParams.set("current", CURRENT_FIELDS)
    url.searchParams.set("daily", DAILY_FIELDS)
    url.searchParams.set("timezone", "auto")
    url.searchParams.set("forecast_days", "1")
    url.searchParams.set("temperature_unit", "celsius")
    url.searchParams.set("wind_speed_unit", "mph")

    return url.toString()
}

// Open-Meteo takes a point directly, so unlike the postcode page there is no
// lookup step: the marker's position is already the whole question.
export const current_weather = (
    position: Position
): Effect.Effect<Forecast, WeatherError> =>
    Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
            fetch(forecast_url(position))
        )

        if (!response.ok) {
            return yield* new WeatherError({
                reason: `Open-Meteo answered ${response.status}.`,
            })
        }

        const forecast = yield* S.decodeUnknownEffect(ForecastResponse)(
            yield* Effect.tryPromise(() => response.json())
        )

        const { current, daily } = forecast

        return {
            current: {
                temperature: Math.round(current.temperature_2m),
                feels_like: Math.round(current.apparent_temperature),
                description: weather_code_to_description(current.weather_code),
                is_day: current.is_day === 1,
                humidity: current.relative_humidity_2m,
                precipitation: current.precipitation,
                cloud_cover: current.cloud_cover,
                pressure: Math.round(current.pressure_msl),
                wind_speed: Math.round(current.wind_speed_10m),
                wind_gusts: Math.round(current.wind_gusts_10m),
                wind_bearing: current.wind_direction_10m,
                wind_compass: compass_point(current.wind_direction_10m),
            },
            today: {
                high: Math.round(daily.temperature_2m_max[0] ?? 0),
                low: Math.round(daily.temperature_2m_min[0] ?? 0),
                sunrise: clock_time(daily.sunrise[0]),
                sunset: clock_time(daily.sunset[0]),
                uv_index_max: daily.uv_index_max[0] ?? undefined,
                precipitation_chance:
                    daily.precipitation_probability_max[0] ?? undefined,
            },
            elevation_metres: Math.round(forecast.elevation),
            timezone: forecast.timezone,
        }
    }).pipe(
        // Everything the request can go wrong with reads the same to someone
        // looking at the panel, so only the status code is worth keeping apart.
        Effect.catch((error) =>
            Effect.fail(
                error instanceof WeatherError
                    ? error
                    : new WeatherError({
                          reason: "Could not reach Open-Meteo.",
                      })
            )
        )
    )
