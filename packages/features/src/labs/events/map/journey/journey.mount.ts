import { Effect } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import {
    CAMERA_PITCH,
    CAMERA_START_BEARING,
    MAP_STYLE_URL,
    ROUTE_CASING_COLOR,
    ROUTE_CASING_LAYER_ID,
    ROUTE_LINE_COLOR,
    ROUTE_LINE_LAYER_ID,
    ROUTE_SOURCE_ID,
    SKY_LAYER_ID,
    TERRAIN_EXAGGERATION,
    TERRAIN_SOURCE_ID,
} from "./journey.constant.ts"
import { HOST_ID, removeEntry, setEntry } from "./journey.host.ts"
import { journeyStudios } from "./journey.leg.ts"
import { FailedMountMap, SucceededMountMap } from "./journey.message.ts"

export const journeyHostId = HOST_ID

const getAccessToken = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

export const mountMap = (hostId: string) =>
    Mount.define("MountMap", {
        messages: [SucceededMountMap, FailedMountMap],
        execute: ({ element }) => {
            return Effect.acquireRelease(
                Effect.gen(function* () {
                    if (!(element instanceof HTMLElement)) {
                        return {
                            message: FailedMountMap({
                                reason: "Map host is not an HTMLElement.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const accessToken = getAccessToken()

                    if (accessToken.trim().length === 0) {
                        return {
                            message: FailedMountMap({
                                reason: "Missing Mapbox access token. Set VITE_MAPBOX_ACCESS_TOKEN.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const mapbox = yield* Effect.tryPromise(
                        () => import("mapbox-gl")
                    )

                    const start = journeyStudios[0]

                    if (start === undefined) {
                        return {
                            message: FailedMountMap({
                                reason: "The journey has no stops.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    // Non-interactive: the camera is flown frame by frame during a
                    // run, and a drag would fight it for control.
                    const map = new mapbox.default.Map({
                        accessToken,
                        container: element,
                        style: MAP_STYLE_URL,
                        center: [start.lng, start.lat],
                        zoom: 12,
                        pitch: CAMERA_PITCH,
                        bearing: CAMERA_START_BEARING,
                        interactive: false,
                        performanceMetricsCollection: false,
                    })

                    yield* Effect.callback<void>((resume) => {
                        if (map.isStyleLoaded()) {
                            resume(Effect.void)
                            return
                        }

                        map.once("load", () => resume(Effect.void))
                    })

                    map.addSource(TERRAIN_SOURCE_ID, {
                        type: "raster-dem",
                        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                        tileSize: 512,
                        maxzoom: 14,
                    })

                    map.setTerrain({
                        source: TERRAIN_SOURCE_ID,
                        exaggeration: TERRAIN_EXAGGERATION,
                    })

                    map.addLayer({
                        id: SKY_LAYER_ID,
                        type: "sky",
                        paint: {
                            "sky-type": "atmosphere",
                            "sky-atmosphere-sun": [0.0, 90.0],
                            "sky-atmosphere-sun-intensity": 15,
                        },
                    })

                    // lineMetrics is what makes the reveal possible: it gives the
                    // line a `line-progress` value per point, which the animation
                    // steps a gradient against instead of pushing new geometry at
                    // the source every frame.
                    map.addSource(ROUTE_SOURCE_ID, {
                        type: "geojson",
                        lineMetrics: true,
                        data: { type: "FeatureCollection", features: [] },
                    })

                    map.addLayer({
                        id: ROUTE_CASING_LAYER_ID,
                        type: "line",
                        source: ROUTE_SOURCE_ID,
                        layout: { "line-cap": "round", "line-join": "round" },
                        paint: {
                            "line-color": ROUTE_CASING_COLOR,
                            "line-width": 11,
                            "line-opacity": 0.35,
                        },
                    })

                    map.addLayer({
                        id: ROUTE_LINE_LAYER_ID,
                        type: "line",
                        source: ROUTE_SOURCE_ID,
                        layout: { "line-cap": "round", "line-join": "round" },
                        paint: {
                            "line-color": ROUTE_LINE_COLOR,
                            "line-width": 6,
                        },
                    })

                    journeyStudios.forEach((studio) => {
                        new mapbox.default.Marker({
                            color: ROUTE_LINE_COLOR,
                            scale: 0.6,
                        })
                            .setLngLat([studio.lng, studio.lat])
                            .addTo(map)
                    })

                    setEntry(hostId, {
                        map,
                        MercatorCoordinate: mapbox.MercatorCoordinate,
                    })

                    return {
                        message: SucceededMountMap({ hostId }),
                        cleanup: (): void => removeEntry(hostId),
                    }
                }),
                ({ cleanup }) => Effect.sync(cleanup)
            ).pipe(
                Effect.catch(() =>
                    Effect.succeed({
                        message: FailedMountMap({
                            reason: "Map host could not be initialized.",
                        }),
                        cleanup: (): void => undefined,
                    })
                ),
                Effect.map(({ message }) => message)
            )
        },
    })()
