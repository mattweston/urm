import { Array, Effect, Option } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import {
    INITIAL_CENTER_LAT,
    INITIAL_CENTER_LNG,
    INITIAL_ZOOM,
    ROUTE_LINE_COLOR,
} from "./interactive-map.constant.ts"
import { addSourcesAndLayers } from "./interactive-map.layer.ts"
import { initialMapStyleId, mapStyleUrl } from "./interactive-map.style.ts"
import {
    HOST_ID,
    removeMap,
    setGeolocateControl,
    setMap,
    setMarkers,
    type MarkerEntry,
} from "./interactive-map.host.ts"
import { FailedMountMap, SucceededMountMap } from "./interactive-map.message.ts"
import { routeGroups, studios, type Studio } from "./interactive-map.studio.ts"

export const mapHostId = HOST_ID

// The original hard-coded a public token in scripts/map.js. Here it comes from
// the environment, which is why apps/docs reads the repo-root .env.local.
const getAccessToken = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

// The original's `new mapboxgl.Marker({ color, scale: 0.8 })` pin, kept rather
// than replaced with a plain dot. Mapbox builds the pin SVG itself, so the
// studio id is stamped on the element afterwards and clicks are still found by
// `closest("[data-studio-id]")` from whatever part of the SVG was hit.
const tagMarkerElement = (element: HTMLElement, studio: Studio): void => {
    element.dataset["studioId"] = studio.id
    element.setAttribute("role", "button")
    element.setAttribute("tabindex", "0")
    element.setAttribute("aria-label", studio.name)
    element.style.cursor = "pointer"
}

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

                    const styleId = initialMapStyleId()

                    const map = new mapbox.default.Map({
                        accessToken,
                        container: element,
                        style: mapStyleUrl(styleId),
                        center: [INITIAL_CENTER_LNG, INITIAL_CENTER_LAT],
                        zoom: INITIAL_ZOOM,
                        performanceMetricsCollection: false,
                    })

                    map.addControl(
                        new mapbox.default.NavigationControl(),
                        "top-left"
                    )

                    // The original's GeolocateControl, kept as the native control
                    // rather than a button of our own: it draws the accuracy ring
                    // and the heading, which a Command dispatching a fly-to cannot.
                    const geolocateControl =
                        new mapbox.default.GeolocateControl({
                            positionOptions: { enableHighAccuracy: true },
                            trackUserLocation: false,
                            showUserHeading: true,
                        })

                    map.addControl(geolocateControl, "top-left")

                    // Fullscreen is given the map pane, not the map element. The
                    // style picker, profile switcher, help button and legend are
                    // siblings of the map rather than children of it, so making the
                    // map element fullscreen would leave every one of them behind.
                    const fullscreenTarget = element.parentElement

                    map.addControl(
                        new mapbox.default.FullscreenControl(
                            fullscreenTarget === null
                                ? {}
                                : { container: fullscreenTarget }
                        ),
                        "top-left"
                    )

                    map.addControl(
                        new mapbox.default.ScaleControl({
                            maxWidth: 100,
                            unit: "metric",
                        }),
                        "bottom-left"
                    )

                    // Built but not added: an area's pins go on the map only once
                    // that area is ticked, so the map opens showing area labels
                    // rather than all 39 studios at once.
                    const markerEntries: ReadonlyArray<MarkerEntry> = Array.map(
                        studios,
                        (studio) => {
                            const color = Option.match(
                                Array.findFirst(
                                    routeGroups,
                                    (group) => group.id === studio.routeGroupId
                                ),
                                {
                                    onNone: () => ROUTE_LINE_COLOR,
                                    onSome: (group) => group.color,
                                }
                            )

                            const marker = new mapbox.default.Marker({
                                color,
                                scale: 0.8,
                            }).setLngLat([studio.lng, studio.lat])

                            tagMarkerElement(marker.getElement(), studio)

                            return {
                                studioId: studio.id,
                                areaId: studio.routeGroupId,
                                marker,
                            }
                        }
                    )

                    // Sources and layers can only be added once the style has
                    // loaded, so the Mount does not report success until they are
                    // there and the route commands can assume they exist.
                    yield* Effect.callback<void>((resume) => {
                        if (map.isStyleLoaded()) {
                            resume(Effect.void)
                            return
                        }

                        map.once("load", () => resume(Effect.void))
                    })

                    addSourcesAndLayers(map)

                    setMap(hostId, map)
                    setGeolocateControl(hostId, geolocateControl)
                    setMarkers(hostId, markerEntries)

                    return {
                        message: SucceededMountMap({ hostId, styleId }),
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
