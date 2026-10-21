import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Array, Data, Effect, Option, Schema as S, String } from "effect"
import { KeyValueStore } from "effect/unstable/persistence"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/unstable/http"
import { Command, Dom } from "foldkit"
import {
    LOCATION_NOTICE_STORAGE_KEY,
    SEARCH_INPUT_ID,
    STORAGE_KEY,
} from "./interactive-map.constant.ts"
import { getMap, showMarkersForAreas } from "./interactive-map.host.ts"
import {
    addSourcesAndLayers,
    setRouteLineData,
    setSelectedAreas,
} from "./interactive-map.layer.ts"
import { mapStyleUrl, MapStyleId } from "./interactive-map.style.ts"
import {
    CompletedClearRoute,
    CompletedDrawRoute,
    CompletedFocusSearchInput,
    CompletedSaveLocationNoticePreference,
    CompletedSaveSelection,
    CompletedSetMapStyle,
    CompletedSyncMarkers,
    FailedFetchRoute,
    FailedFlyTo,
    LoadedLocationNoticePreference,
    LoadedSelection,
    SucceededFetchRoute,
    SucceededFlyTo,
} from "./interactive-map.message.ts"
import { RouteProfile, SavedSelection } from "./interactive-map.model.ts"
import { RouteGroupId, studios } from "./interactive-map.studio.ts"

const DIRECTIONS_API = "https://api.mapbox.com/directions/v5/mapbox"

const Coordinate = S.Tuple([S.Number, S.Number])

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

const flyToMap = (
    hostId: string,
    lng: number,
    lat: number,
    zoom: number
): Effect.Effect<typeof SucceededFlyTo.Type | typeof FailedFlyTo.Type> =>
    Option.match(getMap(hostId), {
        onNone: () =>
            Effect.succeed(
                FailedFlyTo({
                    reason: `Could not find a live map for hostId ${hostId}.`,
                })
            ),
        onSome: (map) =>
            Effect.sync(() => {
                map.flyTo({ center: [lng, lat], zoom, essential: true })
                return SucceededFlyTo()
            }),
    })

export const FlyTo = Command.define("FlyTo", {
    args: {
        maybeHostId: S.Option(S.String),
        lng: S.Number,
        lat: S.Number,
        zoom: S.Number,
    },
    messages: [SucceededFlyTo, FailedFlyTo],
    execute: ({ maybeHostId, lng, lat, zoom }) =>
        Option.match(maybeHostId, {
            onNone: () =>
                Effect.succeed(
                    FailedFlyTo({
                        reason: "FlyTo dispatched before the map mounted.",
                    })
                ),
            onSome: (hostId) => flyToMap(hostId, lng, lat, zoom),
        }),
})

// The selection is a list of studio ids and a travel profile, so the request is
// built here rather than held anywhere: the Model says which studios and how,
// this says what that means in Directions API terms.
const FetchRoute = Command.define("FetchRoute", {
    args: { studioIds: S.Array(S.String), profile: RouteProfile },
    messages: [SucceededFetchRoute, FailedFetchRoute],
    execute: ({ studioIds, profile }) =>
        Effect.gen(function* () {
            const accessToken = getAccessToken()

            if (String.isEmpty(String.trim(accessToken))) {
                return yield* new DirectionsError({
                    reason: "Missing Mapbox access token.",
                })
            }

            const coordinates = Array.flatMap(studioIds, (studioId) =>
                Option.match(
                    Array.findFirst(
                        studios,
                        (studio) => studio.id === studioId
                    ),
                    {
                        onNone: (): ReadonlyArray<string> => [],
                        onSome: ({ lng, lat }) => [`${lng},${lat}`],
                    }
                )
            )

            if (coordinates.length < 2) {
                return yield* new DirectionsError({
                    reason: "A route needs at least two studios.",
                })
            }

            const client = yield* HttpClient.HttpClient

            const request = HttpClientRequest.get(
                `${DIRECTIONS_API}/${profile}/${coordinates.join(";")}`
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

            const route = maybeRoute.value

            return SucceededFetchRoute({
                coordinates: route.geometry.coordinates,
                distanceMeters: route.distance,
                durationSeconds: route.duration,
            })
        }).pipe(
            Effect.catchTag("DirectionsError", ({ reason }) =>
                Effect.succeed(FailedFetchRoute({ reason }))
            ),
            Effect.catch(() =>
                Effect.succeed(
                    FailedFetchRoute({
                        reason: "Could not reach the Directions API.",
                    })
                )
            ),
            Effect.provideService(HttpClient.TracerPropagationEnabled, false),
            Effect.provide(FetchHttpClient.layer)
        ),
})

const setRouteData = (
    maybeHostId: Option.Option<string>,
    coordinates: ReadonlyArray<readonly [number, number]>
): Effect.Effect<void> =>
    Option.match(maybeHostId, {
        onNone: () => Effect.void,
        onSome: (hostId) =>
            Option.match(getMap(hostId), {
                onNone: () => Effect.void,
                onSome: (map) =>
                    Effect.sync(() => setRouteLineData(map, coordinates)),
            }),
    }).pipe(Effect.ignore)

// Swapping the basemap tears down every source and layer with it, so they are
// put back once the new style reports in and the route is redrawn from the
// geometry the Model still holds — no second call to the Directions API.
const SetMapStyle = Command.define("SetMapStyle", {
    args: {
        maybeHostId: S.Option(S.String),
        styleId: MapStyleId,
        areaIds: S.Array(RouteGroupId),
        coordinates: S.Array(Coordinate),
    },
    messages: [CompletedSetMapStyle],
    execute: ({ maybeHostId, styleId, areaIds, coordinates }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.void,
            onSome: (hostId) =>
                Option.match(getMap(hostId), {
                    onNone: () => Effect.void,
                    onSome: (map) =>
                        Effect.gen(function* () {
                            map.setStyle(mapStyleUrl(styleId))

                            yield* Effect.callback<void>((resume) => {
                                map.once("style.load", () =>
                                    resume(Effect.void)
                                )
                            })

                            addSourcesAndLayers(map)
                            setSelectedAreas(map, areaIds)
                            setRouteLineData(map, coordinates)
                        }),
                }),
        }).pipe(Effect.ignore, Effect.as(CompletedSetMapStyle())),
})

export const setMapStyle = (
    maybeHostId: Option.Option<string>,
    styleId: MapStyleId,
    areaIds: ReadonlyArray<RouteGroupId>,
    coordinates: ReadonlyArray<readonly [number, number]>
) => SetMapStyle({ maybeHostId, styleId, areaIds, coordinates })

const DrawRoute = Command.define("DrawRoute", {
    args: {
        maybeHostId: S.Option(S.String),
        coordinates: S.Array(Coordinate),
    },
    messages: [CompletedDrawRoute],
    execute: ({ maybeHostId, coordinates }) =>
        setRouteData(maybeHostId, coordinates).pipe(
            Effect.as(CompletedDrawRoute())
        ),
})

const ClearRoute = Command.define("ClearRoute", {
    args: { maybeHostId: S.Option(S.String) },
    messages: [CompletedClearRoute],
    execute: ({ maybeHostId }) =>
        setRouteData(maybeHostId, []).pipe(Effect.as(CompletedClearRoute())),
})

const SaveSelection = Command.define("SaveSelection", {
    args: { areaIds: S.Array(RouteGroupId) },
    messages: [CompletedSaveSelection],
    execute: ({ areaIds }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                STORAGE_KEY,
                S.encodeSync(S.fromJsonString(SavedSelection))({ areaIds })
            )
            return CompletedSaveSelection()
        }).pipe(
            Effect.catch(() => Effect.succeed(CompletedSaveSelection())),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})

export const LoadSelection = Command.define("LoadSelection", {
    messages: [LoadedSelection],
    execute: Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        const maybeSaved = Option.fromNullishOr(yield* store.get(STORAGE_KEY))

        return yield* Option.match(maybeSaved, {
            onNone: () =>
                Effect.succeed(
                    LoadedSelection({ maybeAreaIds: Option.none() })
                ),
            // A decode failure is an area id that no longer exists, which the
            // catch below turns into a stored-but-empty selection rather than
            // leaving the sidebar checked against nothing.
            onSome: (saved) =>
                S.decodeUnknownEffect(S.fromJsonString(SavedSelection))(
                    saved
                ).pipe(
                    Effect.map(({ areaIds }) =>
                        LoadedSelection({ maybeAreaIds: Option.some(areaIds) })
                    )
                ),
        })
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(LoadedSelection({ maybeAreaIds: Option.some([]) }))
        ),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage)
    ),
})

const LoadLocationNoticePreference = Command.define(
    "LoadLocationNoticePreference",
    {
        messages: [LoadedLocationNoticePreference],
        execute: Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            const maybeValue = Option.fromNullishOr(
                yield* store.get(LOCATION_NOTICE_STORAGE_KEY)
            )

            return LoadedLocationNoticePreference({
                isDismissed: Option.match(maybeValue, {
                    onNone: () => false,
                    onSome: (value) => value === "true",
                }),
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    LoadedLocationNoticePreference({ isDismissed: false })
                )
            ),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
    }
)

const SaveLocationNoticePreference = Command.define(
    "SaveLocationNoticePreference",
    {
        args: { isDismissed: S.Boolean },
        messages: [CompletedSaveLocationNoticePreference],
        execute: ({ isDismissed }) =>
            Effect.gen(function* () {
                const store = yield* KeyValueStore.KeyValueStore

                yield* isDismissed
                    ? store.set(LOCATION_NOTICE_STORAGE_KEY, "true")
                    : store.remove(LOCATION_NOTICE_STORAGE_KEY)

                return CompletedSaveLocationNoticePreference()
            }).pipe(
                Effect.catch(() =>
                    Effect.succeed(CompletedSaveLocationNoticePreference())
                ),
                Effect.provide(BrowserKeyValueStore.layerLocalStorage)
            ),
    }
)

export const FocusSearchInput = Command.define("FocusSearchInput", {
    messages: [CompletedFocusSearchInput],
    execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusSearchInput())
    ),
})

export const fetchRoute = (
    studioIds: ReadonlyArray<string>,
    profile: RouteProfile
) => FetchRoute({ studioIds, profile })

export const drawRoute = (
    maybeHostId: Option.Option<string>,
    coordinates: ReadonlyArray<readonly [number, number]>
) => DrawRoute({ maybeHostId, coordinates })

export const clearRoute = (maybeHostId: Option.Option<string>) =>
    ClearRoute({ maybeHostId })

const SyncMarkers = Command.define("SyncMarkers", {
    args: {
        maybeHostId: S.Option(S.String),
        areaIds: S.Array(RouteGroupId),
    },
    messages: [CompletedSyncMarkers],
    execute: ({ maybeHostId, areaIds }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.void,
            onSome: (hostId) =>
                Effect.sync(() => {
                    showMarkersForAreas(hostId, areaIds)

                    Option.match(getMap(hostId), {
                        onNone: () => undefined,
                        onSome: (map) => setSelectedAreas(map, areaIds),
                    })
                }),
        }).pipe(Effect.ignore, Effect.as(CompletedSyncMarkers())),
})

export const syncMarkers = (
    maybeHostId: Option.Option<string>,
    areaIds: ReadonlyArray<RouteGroupId>
) => SyncMarkers({ maybeHostId, areaIds })

export const saveSelection = (areaIds: ReadonlyArray<RouteGroupId>) =>
    SaveSelection({ areaIds })

export const loadLocationNoticePreference = () => LoadLocationNoticePreference()

export const saveLocationNoticePreference = (isDismissed: boolean) =>
    SaveLocationNoticePreference({ isDismissed })
