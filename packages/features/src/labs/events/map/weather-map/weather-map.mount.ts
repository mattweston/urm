import { Effect } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import { emitMoved, HOST_ID, removeMap, setMap } from "./weather-map.host.ts"
import { FailedMountMap, SucceededMountMap } from "./weather-map.message.ts"
import type { Position } from "./weather.ts"

const MAP_STYLE_URL = "mapbox://styles/mapbox/outdoors-v12"

const getAccessToken = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

export const weatherMapHostId = HOST_ID

export const mountMap = (hostId: string, initial: Position) =>
    Mount.define("MountWeatherMap", {
        messages: [SucceededMountMap, FailedMountMap],
        execute: ({ element }) =>
            Effect.acquireRelease(
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
                    const map = new mapbox.default.Map({
                        accessToken,
                        container: element,
                        style: MAP_STYLE_URL,
                        center: [initial.lng, initial.lat],
                        zoom: 9,
                        performanceMetricsCollection: false,
                    })
                    map.addControl(
                        new mapbox.default.NavigationControl(),
                        "top-right"
                    )

                    const marker = new mapbox.default.Marker({
                        color: "#f84d4d",
                        draggable: true,
                    })
                        .setLngLat([initial.lng, initial.lat])
                        .addTo(map)

                    marker.on("dragend", () => {
                        const { lng, lat } = marker.getLngLat()
                        emitMoved(hostId, { lng, lat })
                    })
                    map.on("click", ({ lngLat: { lng, lat } }) => {
                        marker.setLngLat([lng, lat])
                        emitMoved(hostId, { lng, lat })
                    })

                    setMap(hostId, map)

                    return {
                        message: SucceededMountMap({ hostId }),
                        cleanup: (): void => removeMap(hostId),
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
            ),
    })()
