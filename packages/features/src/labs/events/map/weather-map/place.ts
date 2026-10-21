import { Data, Effect, Schema as S } from "effect"

import type { Position } from "./weather.ts"

const POSTCODES_API = "https://api.postcodes.io/postcodes"

// The largest radius the service accepts. The default of 100 m answers null
// for most of a rural valley, which reads as "nowhere" for a point that is
// plainly somewhere.
const SEARCH_RADIUS_METRES = 2000

// Being outside the UK is an ordinary answer, not a failure: the map is the
// whole globe and postcodes.io only covers one country of it.
export const Place = S.Union([
    S.Struct({
        kind: S.Literal("place"),
        postcode: S.String,
        district: S.String,
        ward: S.String,
        parish: S.optional(S.String),
        region: S.optional(S.String),
        country: S.String,
        metres_away: S.Number,
    }),
    S.Struct({ kind: S.Literal("outside_coverage") }),
])
export type Place = typeof Place.Type

export class PlaceError extends Data.TaggedError("PlaceError")<{
    readonly reason: string
}> {}

const PlaceResult = S.Struct({
    postcode: S.String,
    admin_district: S.NullOr(S.String),
    admin_ward: S.NullOr(S.String),
    parish: S.NullOr(S.String),
    region: S.NullOr(S.String),
    country: S.NullOr(S.String),
    distance: S.Number,
})

// `result` is null rather than an empty array when nothing is in range.
const PlaceResponse = S.Struct({
    result: S.NullOr(S.Array(PlaceResult)),
})

const place_url = ({ lng, lat }: Position): string => {
    const url = new URL(POSTCODES_API)

    url.searchParams.set("lon", `${lng}`)
    url.searchParams.set("lat", `${lat}`)
    url.searchParams.set("radius", `${SEARCH_RADIUS_METRES}`)
    url.searchParams.set("limit", "1")

    return url.toString()
}

// Names the marker with the nearest UK postcode and its administrative
// geography — ward and parish included, which a general geocoder does not give
// and which is the level open studios are actually organised at.
export const nearest_place = (
    position: Position
): Effect.Effect<Place, PlaceError> =>
    Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
            fetch(place_url(position))
        )

        if (!response.ok) {
            return yield* new PlaceError({
                reason: `postcodes.io answered ${response.status}.`,
            })
        }

        const { result } = yield* S.decodeUnknownEffect(PlaceResponse)(
            yield* Effect.tryPromise(() => response.json())
        )

        const nearest = result?.[0]

        if (nearest === undefined) {
            // Annotated rather than asserted: without a contextual type the
            // tag widens to `string` and stops discriminating the union.
            const outside: Place = { kind: "outside_coverage" }

            return outside
        }

        const place: Place = {
            kind: "place",
            postcode: nearest.postcode,
            district: nearest.admin_district ?? "Unknown district",
            ward: nearest.admin_ward ?? "Unknown ward",
            // "Unparished area" is a real value and says nothing worth showing.
            parish:
                nearest.parish === null || nearest.parish === "Unparished area"
                    ? undefined
                    : nearest.parish,
            region: nearest.region ?? undefined,
            country: nearest.country ?? "United Kingdom",
            metres_away: Math.round(nearest.distance),
        }

        return place
    }).pipe(
        Effect.catch((error) =>
            Effect.fail(
                error instanceof PlaceError
                    ? error
                    : new PlaceError({
                          reason: "Could not reach postcodes.io.",
                      })
            )
        )
    )
