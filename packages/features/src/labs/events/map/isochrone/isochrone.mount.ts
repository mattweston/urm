import { Array, Effect } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import { studios } from "../interactive-map/interactive-map.studio.ts"
import {
    BAND_FILL_OPACITY,
    ISOCHRONE_FILL_LAYER_ID,
    ISOCHRONE_LINE_LAYER_ID,
    ISOCHRONE_SOURCE_ID,
    MAP_STYLE_URL,
    ORIGIN_MARKER_COLOR,
    STUDIO_MARKER_COLOR,
} from "./isochrone.constant.ts"
import {
    HOST_ID,
    notifyStudioClicked,
    removeEntry,
    setEntry,
} from "./isochrone.host.ts"
import { FailedMountMap, SucceededMountMap } from "./isochrone.message.ts"
import { initialModel } from "./isochrone.model.ts"

export const isochroneHostId = HOST_ID

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

                    const origin =
                        studios.find(
                            (studio) =>
                                studio.id === initialModel.originStudioId
                        ) ?? studios[0]

                    if (origin === undefined) {
                        return {
                            message: FailedMountMap({
                                reason: "There are no studios to measure from.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const map = new mapbox.default.Map({
                        accessToken,
                        container: element,
                        style: MAP_STYLE_URL,
                        center: [origin.lng, origin.lat],
                        zoom: 11.5,
                        performanceMetricsCollection: false,
                    })

                    map.addControl(
                        new mapbox.default.NavigationControl(),
                        "top-left"
                    )

                    yield* Effect.callback<void>((resume) => {
                        if (map.isStyleLoaded()) {
                            resume(Effect.void)
                            return
                        }

                        map.once("load", () => resume(Effect.void))
                    })

                    map.addSource(ISOCHRONE_SOURCE_ID, {
                        type: "geojson",
                        data: { type: "FeatureCollection", features: [] },
                    })

                    // Colour comes off the feature, which is why the request asks
                    // the API for the colours the legend already uses.
                    map.addLayer({
                        id: ISOCHRONE_FILL_LAYER_ID,
                        type: "fill",
                        source: ISOCHRONE_SOURCE_ID,
                        paint: {
                            "fill-color": ["get", "color"],
                            "fill-opacity": BAND_FILL_OPACITY,
                        },
                    })

                    map.addLayer({
                        id: ISOCHRONE_LINE_LAYER_ID,
                        type: "line",
                        source: ISOCHRONE_SOURCE_ID,
                        paint: {
                            "line-color": ["get", "color"],
                            "line-width": 1.5,
                            "line-opacity": 0.7,
                        },
                    })

                    // Every studio is a target you can measure from, so each marker
                    // carries its own click rather than the container delegating.
                    Array.forEach(studios, (studio) => {
                        const marker = new mapbox.default.Marker({
                            color: STUDIO_MARKER_COLOR,
                            scale: 0.55,
                        })
                            .setLngLat([studio.lng, studio.lat])
                            .addTo(map)

                        const markerElement = marker.getElement()
                        markerElement.style.cursor = "pointer"
                        markerElement.setAttribute("role", "button")
                        markerElement.setAttribute("aria-label", studio.name)
                        markerElement.addEventListener("click", (event) => {
                            event.stopPropagation()
                            notifyStudioClicked(hostId, studio.id)
                        })
                    })

                    // Drawn after the studios so it sits above them.
                    const originMarker = new mapbox.default.Marker({
                        color: ORIGIN_MARKER_COLOR,
                    })
                        .setLngLat([origin.lng, origin.lat])
                        .addTo(map)

                    setEntry(hostId, { map, originMarker })

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
