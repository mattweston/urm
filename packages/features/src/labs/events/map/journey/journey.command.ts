import { Array, Data, Effect, Option, Schema as S, String } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/http"
import { Command } from "foldkit"
import {
    CAMERA_ALTITUDE_M,
    CAMERA_BEARING_SWEEP,
    CAMERA_PITCH,
    CAMERA_SMOOTHING,
    CAMERA_START_BEARING,
    JOURNEY_DURATION_MS,
    ROUTE_LINE_COLOR,
    ROUTE_LINE_LAYER_ID,
    ROUTE_SOURCE_ID,
    ROUTE_SPENT_COLOR,
} from "./journey.constant.ts"
import { pointAlong } from "./journey.geo.ts"
import {
    beginRun,
    cancelRun,
    getCameraPosition,
    getEntry,
    isCurrentRun,
    setCameraPosition,
} from "./journey.host.ts"
import { journeyStudios } from "./journey.leg.ts"
import {
    CancelledJourney,
    CompletedDrawRoute,
    CompletedJourney,
    FailedFetchJourney,
    SucceededFetchJourney,
} from "./journey.message.ts"
import { Coordinate } from "./journey.model.ts"

const DIRECTIONS_API = "https://api.mapbox.com/directions/v5/mapbox/driving"

const DirectionsResponse = S.Struct({
    routes: S.Array(
        S.Struct({
            geometry: S.Struct({ coordinates: S.Array(Coordinate) }),
            distance: S.Number,
            duration: S.Number,
        })
    ),
})

class DirectionsError extends Data.TaggedError("DirectionsError")<{
    readonly reason: string
}> {}

const getAccessToken = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

export const FetchJourney = Command.define("FetchJourney", {
    messages: [SucceededFetchJourney, FailedFetchJourney],
    execute: Effect.gen(function* () {
        const accessToken = getAccessToken()

        if (String.isEmpty(String.trim(accessToken))) {
            return yield* new DirectionsError({
                reason: "Missing Mapbox access token.",
            })
        }

        const coordinates = journeyStudios.map(
            ({ lng, lat }) => `${lng},${lat}`
        )

        const client = yield* HttpClient.HttpClient

        const request = HttpClientRequest.get(
            `${DIRECTIONS_API}/${coordinates.join(";")}`
        ).pipe(
            HttpClientRequest.setUrlParams({
                geometries: "geojson",
                overview: "full",
                access_token: accessToken,
            })
        )

        const response = yield* client.execute(request)

        if (response.status !== 200) {
            return yield* new DirectionsError({
                reason: `The Directions API answered ${response.status}.`,
            })
        }

        const directions = yield* S.decodeUnknownEffect(DirectionsResponse)(
            yield* response.json
        )

        const maybeRoute = Array.head(directions.routes)

        if (Option.isNone(maybeRoute)) {
            return yield* new DirectionsError({
                reason: "The Directions API returned no route.",
            })
        }

        return SucceededFetchJourney({
            coordinates: maybeRoute.value.geometry.coordinates,
            distanceMeters: maybeRoute.value.distance,
            durationSeconds: maybeRoute.value.duration,
        })
    }).pipe(
        Effect.catchTag("DirectionsError", ({ reason }) =>
            Effect.succeed(FailedFetchJourney({ reason }))
        ),
        Effect.catch(() =>
            Effect.succeed(
                FailedFetchJourney({
                    reason: "Could not reach the Directions API.",
                })
            )
        ),
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.provide(FetchHttpClient.layer)
    ),
})

const DrawRoute = Command.define("DrawRoute", {
    args: {
        maybeHostId: S.Option(S.String),
        coordinates: S.Array(Coordinate),
        revealed: S.Number,
    },
    messages: [CompletedDrawRoute],
    execute: ({ maybeHostId, coordinates, revealed }) =>
        withMap(maybeHostId, ({ map }) => {
            const source = map.getSource(ROUTE_SOURCE_ID)

            if (source !== undefined && source.type === "geojson") {
                source.setData({
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: coordinates.map(([lng, lat]) => [
                            lng,
                            lat,
                        ]),
                    },
                })
            }

            setRevealed(map, revealed)
        }).pipe(Effect.as(CompletedDrawRoute())),
})

export const drawRoute = (
    maybeHostId: Option.Option<string>,
    coordinates: ReadonlyArray<readonly [number, number]>,
    revealed: number
) => DrawRoute({ maybeHostId, coordinates, revealed })

const withMap = (
    maybeHostId: Option.Option<string>,
    run: (entry: {
        map: import("mapbox-gl").Map
        MercatorCoordinate: typeof import("mapbox-gl").MercatorCoordinate
    }) => void
): Effect.Effect<void> =>
    Option.match(maybeHostId, {
        onNone: () => Effect.void,
        onSome: (hostId) =>
            Option.match(getEntry(hostId), {
                onNone: () => Effect.void,
                onSome: (entry) => Effect.sync(() => run(entry)),
            }),
    }).pipe(Effect.ignore)

// The reveal is a paint property, not new geometry: line-progress runs 0 to 1
// along the line, and the step hides everything past the current phase. The
// whole route is uploaded once and the animation only moves this boundary.
const setRevealed = (map: import("mapbox-gl").Map, revealed: number): void => {
    if (map.getLayer(ROUTE_LINE_LAYER_ID) === undefined) {
        return
    }

    map.setPaintProperty(ROUTE_LINE_LAYER_ID, "line-gradient", [
        "step",
        ["line-progress"],
        ROUTE_LINE_COLOR,
        Math.min(Math.max(revealed, 0.0001), 1),
        ROUTE_SPENT_COLOR,
    ])
}

// Ported from the template's util.js. Given where the camera should be looking
// and how high and tilted it is, this is where the camera itself has to sit —
// trigonometry rather than a lookAt, because mapbox's free camera is positioned,
// not aimed.
const lerp = (start: number, end: number, amount: number): number =>
    (1 - amount) * start + amount * end

const computeCameraPosition = (
    hostId: string,
    pitch: number,
    bearing: number,
    target: { lng: number; lat: number },
    altitude: number
): { lng: number; lat: number } => {
    const bearingInRadian = bearing / 57.29
    const pitchInRadian = (90 - pitch) / 57.29

    const lngDiff =
        ((altitude / Math.tan(pitchInRadian)) * Math.sin(-bearingInRadian)) /
        70000
    const latDiff =
        ((altitude / Math.tan(pitchInRadian)) * Math.cos(-bearingInRadian)) /
        110000

    const next = {
        lng: target.lng + lngDiff,
        lat: target.lat - latDiff,
    }

    // Smoothed against the last frame so the camera trails the leading edge
    // instead of snapping to every vertex the route turns through.
    const smoothed = Option.match(getCameraPosition(hostId), {
        onNone: () => next,
        onSome: (previous) => ({
            lng: lerp(next.lng, previous.lng, CAMERA_SMOOTHING),
            lat: lerp(next.lat, previous.lat, CAMERA_SMOOTHING),
        }),
    })

    setCameraPosition(hostId, smoothed)

    return smoothed
}

const PlayJourney = Command.define("PlayJourney", {
    args: {
        maybeHostId: S.Option(S.String),
        coordinates: S.Array(Coordinate),
    },
    messages: [CompletedJourney, CancelledJourney],
    execute: ({ maybeHostId, coordinates }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.succeed(CancelledJourney()),
            onSome: (hostId) =>
                Option.match(getEntry(hostId), {
                    onNone: () => Effect.succeed(CancelledJourney()),
                    onSome: ({ map, MercatorCoordinate }) =>
                        Effect.callback<
                            | typeof CompletedJourney.Type
                            | typeof CancelledJourney.Type
                        >((resume) => {
                            const token = beginRun(hostId)

                            let startTime: number | undefined

                            const frame = (currentTime: number): void => {
                                // A newer run, or teardown, invalidates this
                                // one: without the check two loops would drive
                                // the same camera.
                                if (!isCurrentRun(hostId, token)) {
                                    resume(Effect.succeed(CancelledJourney()))
                                    return
                                }

                                startTime = startTime ?? currentTime

                                const phase = Math.min(
                                    (currentTime - startTime) /
                                        JOURNEY_DURATION_MS,
                                    1
                                )

                                setRevealed(map, phase)

                                const [lng, lat] = pointAlong(
                                    coordinates,
                                    phase
                                )
                                const bearing =
                                    CAMERA_START_BEARING +
                                    phase * CAMERA_BEARING_SWEEP

                                const position = computeCameraPosition(
                                    hostId,
                                    CAMERA_PITCH,
                                    bearing,
                                    { lng, lat },
                                    CAMERA_ALTITUDE_M
                                )

                                const camera = map.getFreeCameraOptions()
                                camera.setPitchBearing(CAMERA_PITCH, bearing)
                                camera.position = MercatorCoordinate.fromLngLat(
                                    position,
                                    CAMERA_ALTITUDE_M
                                )
                                map.setFreeCameraOptions(camera)

                                if (phase >= 1) {
                                    resume(Effect.succeed(CompletedJourney()))
                                    return
                                }

                                requestAnimationFrame(frame)
                            }

                            requestAnimationFrame(frame)
                        }),
                }),
        }),
})

export const playJourney = (
    maybeHostId: Option.Option<string>,
    coordinates: ReadonlyArray<readonly [number, number]>
) => PlayJourney({ maybeHostId, coordinates })

const ResetJourney = Command.define("ResetJourney", {
    args: {
        maybeHostId: S.Option(S.String),
        coordinates: S.Array(Coordinate),
    },
    messages: [CompletedDrawRoute],
    execute: ({ maybeHostId, coordinates }) =>
        withMap(maybeHostId, ({ map }) => {
            Option.match(maybeHostId, {
                onNone: () => undefined,
                onSome: (hostId) => cancelRun(hostId),
            })

            setRevealed(map, 1)

            const first = coordinates[0]

            if (first !== undefined) {
                map.easeTo({
                    center: [first[0], first[1]],
                    zoom: 12,
                    pitch: CAMERA_PITCH,
                    bearing: CAMERA_START_BEARING,
                    duration: 1200,
                })
            }
        }).pipe(Effect.as(CompletedDrawRoute())),
})

export const resetJourney = (
    maybeHostId: Option.Option<string>,
    coordinates: ReadonlyArray<readonly [number, number]>
) => ResetJourney({ maybeHostId, coordinates })
