import { Data, Effect, Schema as S } from "effect"

import type { Position } from "./weather.ts"

const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality"

export const AirQuality = S.Struct({
    european_aqi: S.optional(S.Number),
    pm2_5: S.optional(S.Number),
    pm10: S.optional(S.Number),
    uv_index: S.optional(S.Number),
    grass_pollen: S.optional(S.Number),
    tree_pollen: S.optional(S.Number),
})
export type AirQuality = typeof AirQuality.Type

export class AirQualityError extends Data.TaggedError("AirQualityError")<{
    readonly reason: string
}> {}

// Every field is nullable rather than merely optional: the pollen models only
// cover Europe, so dropping the marker on Sydney answers with nulls rather than
// omitting the keys or failing.
const AirQualityResponse = S.Struct({
    current: S.Struct({
        european_aqi: S.NullOr(S.Number),
        pm2_5: S.NullOr(S.Number),
        pm10: S.NullOr(S.Number),
        uv_index: S.NullOr(S.Number),
        grass_pollen: S.NullOr(S.Number),
        birch_pollen: S.NullOr(S.Number),
    }),
})

const CURRENT_FIELDS = [
    "european_aqi",
    "pm2_5",
    "pm10",
    "uv_index",
    "grass_pollen",
    "birch_pollen",
].join(",")

// The European AQI bands, which are what make the number mean anything.
export const aqi_band = (
    aqi: number
): Readonly<{ label: string; tone: "good" | "fair" | "poor" }> => {
    if (aqi <= 20) {
        return { label: "Good", tone: "good" }
    }

    if (aqi <= 40) {
        return { label: "Fair", tone: "fair" }
    }

    if (aqi <= 60) {
        return { label: "Moderate", tone: "fair" }
    }

    return { label: "Poor", tone: "poor" }
}

const air_quality_url = ({ lng, lat }: Position): string => {
    const url = new URL(AIR_QUALITY_API)

    url.searchParams.set("latitude", `${lat}`)
    url.searchParams.set("longitude", `${lng}`)
    url.searchParams.set("current", CURRENT_FIELDS)

    return url.toString()
}

export const current_air_quality = (
    position: Position
): Effect.Effect<AirQuality, AirQualityError> =>
    Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
            fetch(air_quality_url(position))
        )

        if (!response.ok) {
            return yield* new AirQualityError({
                reason: `The air quality API answered ${response.status}.`,
            })
        }

        const { current } = yield* S.decodeUnknownEffect(AirQualityResponse)(
            yield* Effect.tryPromise(() => response.json())
        )

        return {
            european_aqi: current.european_aqi ?? undefined,
            pm2_5: current.pm2_5 ?? undefined,
            pm10: current.pm10 ?? undefined,
            uv_index: current.uv_index ?? undefined,
            grass_pollen: current.grass_pollen ?? undefined,
            tree_pollen: current.birch_pollen ?? undefined,
        }
    }).pipe(
        Effect.catch((error) =>
            Effect.fail(
                error instanceof AirQualityError
                    ? error
                    : new AirQualityError({
                          reason: "Could not reach the air quality API.",
                      })
            )
        )
    )
