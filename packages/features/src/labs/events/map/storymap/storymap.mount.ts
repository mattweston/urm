import { Array, Effect, Option } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import { chapters } from "./storymap.chapter.ts"
import {
    INSET_MARKER_COLOR,
    INSET_STYLE_URL,
    INSET_ZOOM,
    MAP_STYLE_URL,
    MARKER_COLOR,
    SKY_LAYER_ID,
    TERRAIN_EXAGGERATION,
    TERRAIN_SOURCE_ID,
} from "./storymap.constant.ts"
import {
    HOST_ID,
    observeChapterElement,
    removeEntry,
    setEntry,
    setMarkers,
    unobserveChapterElement,
    type MarkerEntry,
} from "./storymap.host.ts"
import {
    routeGroups,
    studios,
} from "../interactive-map/interactive-map.studio.ts"
import {
    FailedMountMap,
    FailedObserveChapter,
    SucceededMountMap,
    SucceededObserveChapter,
} from "./storymap.message.ts"

export const storyHostId = HOST_ID

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

                    const opening = Array.head(chapters)

                    if (Option.isNone(opening)) {
                        return {
                            message: FailedMountMap({
                                reason: "The story has no chapters.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const { location } = opening.value

                    // Not interactive: the scroll position is the only thing that
                    // drives the camera, so letting a drag fight it would put the
                    // map out of step with the chapter being read.
                    const map = new mapbox.default.Map({
                        accessToken,
                        container: element,
                        style: MAP_STYLE_URL,
                        center: [location.lng, location.lat],
                        zoom: location.zoom,
                        pitch: location.pitch,
                        bearing: location.bearing,
                        interactive: false,
                        performanceMetricsCollection: false,
                    })

                    // Built but not added. A chapter shows its own valley's
                    // studios and hides the last one's, so the pins on screen are
                    // always the ones the paragraph beside them names. Coloured by
                    // area, matching the interactive map's legend.
                    const markerEntries: ReadonlyArray<MarkerEntry> = Array.map(
                        studios,
                        (studio) => {
                            const color = Option.match(
                                Array.findFirst(
                                    routeGroups,
                                    (group) => group.id === studio.routeGroupId
                                ),
                                {
                                    onNone: () => MARKER_COLOR,
                                    onSome: (group) => group.color,
                                }
                            )

                            return {
                                studioId: studio.id,
                                areaId: studio.routeGroupId,
                                marker: new mapbox.default.Marker({
                                    color,
                                    scale: 0.75,
                                }).setLngLat([studio.lng, studio.lat]),
                            }
                        }
                    )

                    // The original used the mapbox-gl-globe-minimap CDN plugin for
                    // this. A second, tiny globe-projected map does the same job
                    // without the dependency.
                    const insetElement = document.createElement("div")
                    insetElement.className =
                        "absolute bottom-4 left-4 w-32 h-32 rounded-full overflow-hidden border-(length:--surface-border-width) border-white/20 [box-shadow:var(--shadow-overlay)] pointer-events-none"
                    element.appendChild(insetElement)

                    const insetMap = new mapbox.default.Map({
                        accessToken,
                        container: insetElement,
                        style: INSET_STYLE_URL,
                        center: [location.lng, location.lat],
                        zoom: INSET_ZOOM,
                        projection: "globe",
                        interactive: false,
                        attributionControl: false,
                        performanceMetricsCollection: false,
                    })

                    const insetMarker = new mapbox.default.Marker({
                        color: INSET_MARKER_COLOR,
                        scale: 0.6,
                    })
                        .setLngLat([location.lng, location.lat])
                        .addTo(insetMap)

                    // Terrain and the sky layer can only go on once the style
                    // has loaded, and they are what make a valley look like one at
                    // a 60-degree pitch.
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

                    setEntry(hostId, {
                        map,
                        inset: Option.some({
                            map: insetMap,
                            marker: insetMarker,
                        }),
                    })
                    setMarkers(hostId, markerEntries)

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

// One per chapter section. This is what replaces scrollama: a chapter joins the
// observer as it enters the DOM and leaves it on teardown, so nothing has to
// guess when the story column is complete.
export const mountChapter = (hostId: string) =>
    Mount.define("MountChapter", {
        messages: [SucceededObserveChapter, FailedObserveChapter],
        execute: ({ element }) => {
            return Effect.acquireRelease(
                Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                        return {
                            message: FailedObserveChapter({
                                reason: "Chapter host is not an HTMLElement.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    observeChapterElement(hostId, element)

                    return {
                        message: SucceededObserveChapter(),
                        cleanup: (): void =>
                            unobserveChapterElement(hostId, element),
                    }
                }),
                ({ cleanup }) => Effect.sync(cleanup)
            ).pipe(Effect.map(({ message }) => message))
        },
    })()
