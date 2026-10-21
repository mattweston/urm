import { Array, Data, Effect, Option, Schema as S, String } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http"
import { Command } from "foldkit"
import { studios } from "../interactive-map/interactive-map.studio.ts"
import {
    CONTOUR_COLORS,
    CONTOUR_MINUTES,
    GENERALIZE_METRES,
    ISOCHRONE_SOURCE_ID,
} from "./isochrone.constant.ts"
import { getEntry } from "./isochrone.host.ts"
import {
    CompletedDrawBands,
    CompletedFlyToOrigin,
    FailedFetchBands,
    SucceededFetchBands,
} from "./isochrone.message.ts"
import { Band, TravelProfile } from "./isochrone.model.ts"

const ISOCHRONE_API = "https://api.mapbox.com/isochrone/v1/mapbox"

// Only what is actually read. The API also returns fill, opacity and
// fill-opacity per feature, which the layers set themselves.
const IsochroneResponse = S.Struct({
    features: S.Array(
        S.Struct({
            properties: S.Struct({
                contour: S.Number,
                color: S.String,
            }),
            geometry: S.Struct({
                coordinates: S.Array(S.Array(S.Tuple([S.Number, S.Number]))),
            }),
        })
    ),
})

class IsochroneError extends Data.TaggedError("IsochroneError")<{
    readonly reason: string
}> {}

const getAccessToken = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

const FetchBands = Command.define("FetchBands", {
    args: { studioId: S.String, profile: TravelProfile },
    messages: [SucceededFetchBands, FailedFetchBands],
    execute: ({ studioId, profile }) =>
        Effect.gen(function* () {
            const accessToken = getAccessToken()

            if (String.isEmpty(String.trim(accessToken))) {
                return yield* new IsochroneError({
                    reason: "Missing Mapbox access token.",
                })
            }

            const maybeStudio = Array.findFirst(
                studios,
                (studio) => studio.id === studioId
            )

            if (Option.isNone(maybeStudio)) {
                return yield* new IsochroneError({
                    reason: "That studio is not on the map.",
                })
            }

            const { lng, lat } = maybeStudio.value
            const client = yield* HttpClient.HttpClient

            const request = HttpClientRequest.get(
                `${ISOCHRONE_API}/${profile}/${lng},${lat}`
            ).pipe(
                HttpClientRequest.setUrlParams({
                    contours_minutes: CONTOUR_MINUTES.join(","),
                    contours_colors: CONTOUR_COLORS.join(","),
                    generalize: `${GENERALIZE_METRES}`,
                    polygons: "true",
                    access_token: accessToken,
                })
            )

            const response = yield* client.execute(request)

            if (response.status !== 200) {
                return yield* new IsochroneError({
                    reason: `The Isochrone API answered ${response.status}.`,
                })
            }

            const isochrone = yield* S.decodeUnknownEffect(IsochroneResponse)(
                yield* response.json
            )

            // Largest first, so a smaller band paints over the one containing
            // it rather than disappearing beneath it.
            const bands: ReadonlyArray<Band> = isochrone.features
                .map((feature) => ({
                    minutes: feature.properties.contour,
                    color: feature.properties.color,
                    rings: feature.geometry.coordinates,
                }))
                .sort((left, right) => right.minutes - left.minutes)

            return SucceededFetchBands({ bands })
        }).pipe(
            Effect.catchTag("IsochroneError", ({ reason }) =>
                Effect.succeed(FailedFetchBands({ reason }))
            ),
            Effect.catch(() =>
                Effect.succeed(
                    FailedFetchBands({
                        reason: "Could not reach the Isochrone API.",
                    })
                )
            ),
            Effect.provideService(HttpClient.TracerPropagationEnabled, false),
            Effect.provide(FetchHttpClient.layer)
        ),
})

export const fetchBands = (studioId: string, profile: TravelProfile) =>
    FetchBands({ studioId, profile })

const DrawBands = Command.define("DrawBands", {
    args: { maybeHostId: S.Option(S.String), bands: S.Array(Band) },
    messages: [CompletedDrawBands],
    execute: ({ maybeHostId, bands }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.void,
            onSome: (hostId) =>
                Option.match(getEntry(hostId), {
                    onNone: () => Effect.void,
                    onSome: ({ map }) =>
                        Effect.sync(() => {
                            const source = map.getSource(ISOCHRONE_SOURCE_ID)

                            if (
                                source === undefined ||
                                source.type !== "geojson"
                            ) {
                                return
                            }

                            source.setData({
                                type: "FeatureCollection",
                                features: bands.map((band) => ({
                                    type: "Feature",
                                    properties: {
                                        color: band.color,
                                        minutes: band.minutes,
                                    },
                                    geometry: {
                                        type: "Polygon",
                                        coordinates: band.rings.map((ring) =>
                                            ring.map(([lng, lat]) => [lng, lat])
                                        ),
                                    },
                                })),
                            })
                        }),
                }),
        }).pipe(Effect.ignore, Effect.as(CompletedDrawBands())),
})

export const drawBands = (
    maybeHostId: Option.Option<string>,
    bands: ReadonlyArray<Band>
) => DrawBands({ maybeHostId, bands })

const FlyToOrigin = Command.define("FlyToOrigin", {
    args: { maybeHostId: S.Option(S.String), studioId: S.String },
    messages: [CompletedFlyToOrigin],
    execute: ({ maybeHostId, studioId }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.void,
            onSome: (hostId) =>
                Option.match(getEntry(hostId), {
                    onNone: () => Effect.void,
                    onSome: ({ map, originMarker }) =>
                        Effect.sync(() => {
                            const maybeStudio = Array.findFirst(
                                studios,
                                (studio) => studio.id === studioId
                            )

                            Option.match(maybeStudio, {
                                onNone: () => undefined,
                                onSome: ({ lng, lat }) => {
                                    originMarker.setLngLat([lng, lat])
                                    map.easeTo({
                                        center: [lng, lat],
                                        duration: 900,
                                    })
                                },
                            })
                        }),
                }),
        }).pipe(Effect.ignore, Effect.as(CompletedFlyToOrigin())),
})

export const flyToOrigin = (
    maybeHostId: Option.Option<string>,
    studioId: string
) => FlyToOrigin({ maybeHostId, studioId })
