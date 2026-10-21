import { Array, Effect } from "effect"
import "maplibre-gl/dist/maplibre-gl.css"
import { Mount } from "foldkit"
import { INITIAL_MAP_ZOOM } from "./map.constant.ts"
import { HOST_ID, removeMap, setMap } from "./map.host.ts"
import { featuredLocations } from "./map.location.ts"
import { FailedMountMap, SucceededMountMap } from "./map.message.ts"

const markerClassName =
    "block w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-background shadow cursor-pointer hover:bg-primary/90 transition"

export const mapHostId = HOST_ID

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

                    const maplibre = yield* Effect.tryPromise(
                        () => import("maplibre-gl")
                    )
                    const map = new maplibre.Map({
                        container: element,
                        style: "https://demotiles.maplibre.org/style.json",
                        center: [0, 20],
                        zoom: INITIAL_MAP_ZOOM,
                    })

                    Array.forEach(featuredLocations, ({ id, lng, lat }) => {
                        const markerElement = document.createElement("button")
                        markerElement.setAttribute("data-location-id", id)
                        markerElement.setAttribute(
                            "aria-label",
                            `Marker: ${id}`
                        )
                        markerElement.className = markerClassName

                        new maplibre.Marker({ element: markerElement })
                            .setLngLat([lng, lat])
                            .addTo(map)
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
            )
        },
    })()
