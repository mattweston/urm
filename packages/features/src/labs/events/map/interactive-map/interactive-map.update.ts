import { Array, Equal, Match as M, Option } from "effect"
import { Command } from "foldkit"
import {
    clearRoute,
    drawRoute,
    fetchRoute,
    FlyTo,
    FocusSearchInput,
    loadLocationNoticePreference,
    LoadSelection,
    saveLocationNoticePreference,
    saveSelection,
    setMapStyle,
    syncMarkers,
} from "./interactive-map.command.ts"
import {
    MAX_ROUTE_STUDIOS,
    SELECTED_STUDIO_ZOOM,
} from "./interactive-map.constant.ts"
import type { Message } from "./interactive-map.message.ts"
import type { Model } from "./interactive-map.model.ts"
import {
    GeolocateFailed,
    GeolocateIdle,
    initialModel,
    LocationNoticeHidden,
    LocationNoticeVisible,
    RouteFailed,
    RouteIdle,
    RouteLoaded,
    RouteLoading,
    RouteTooManyStudios,
} from "./interactive-map.model.ts"
import {
    defaultAreaIds,
    studios,
    studiosInAreas,
    type RouteGroupId,
    type Studio,
} from "./interactive-map.studio.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const findStudio = (studioId: string): Option.Option<Studio> =>
    Array.findFirst(studios, ({ id }) => Equal.equals(id, studioId))

// The drawn geometry, when there is one. A style swap needs it to put the route
// back without asking the Directions API again.
const routeCoordinates = (
    model: Model
): ReadonlyArray<readonly [number, number]> =>
    model.routeState._tag === "RouteLoaded" ? model.routeState.coordinates : []

// Every change to the selection has the same consequences — persist it, and
// redraw whatever route it now implies — so they are decided once here instead
// of at each call site.
const withSelection = (
    model: Model,
    selectedAreaIds: ReadonlyArray<RouteGroupId>
): UpdateReturn => {
    const waypoints = studiosInAreas(selectedAreaIds)
    const nextModel: Model = {
        ...model,
        selectedAreaIds,
        routeState: routeStateFor(waypoints.length),
    }

    return [
        nextModel,
        [
            saveSelection(selectedAreaIds),
            syncMarkers(model.maybeMapHostId, selectedAreaIds),
            ...(waypoints.length < 2 || waypoints.length > MAX_ROUTE_STUDIOS
                ? [clearRoute(model.maybeMapHostId)]
                : [
                      fetchRoute(
                          Array.map(waypoints, ({ id }) => id),
                          model.routeProfile
                      ),
                  ]),
        ],
    ]
}

const routeStateFor = (waypointCount: number) =>
    waypointCount < 2
        ? RouteIdle()
        : waypointCount > MAX_ROUTE_STUDIOS
          ? RouteTooManyStudios({ count: waypointCount })
          : RouteLoading()

export const init = (): UpdateReturn => [
    initialModel,
    [LoadSelection(), loadLocationNoticePreference(), FocusSearchInput()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId, styleId }) => {
                const waypoints = studiosInAreas(model.selectedAreaIds)

                // A selection restored from storage arrives before the map
                // exists, so the route it implies is drawn once there is
                // somewhere to draw it.
                const maybeMapHostId = Option.some(hostId)

                return [
                    { ...model, maybeMapHostId, mapStyleId: styleId },
                    [
                        syncMarkers(maybeMapHostId, model.selectedAreaIds),
                        ...(waypoints.length < 2 ||
                        waypoints.length > MAX_ROUTE_STUDIOS
                            ? []
                            : [
                                  fetchRoute(
                                      Array.map(waypoints, ({ id }) => id),
                                      model.routeProfile
                                  ),
                              ]),
                    ],
                ]
            },
            FailedMountMap: ({ reason }) => [
                { ...model, maybeMapError: Option.some(reason) },
                [],
            ],
            // A marker click and a sidebar click both open the details panel;
            // only the sidebar one moves the camera, because clicking a marker
            // means you are already looking at it.
            ClickedMarker: ({ studioId }) => [
                { ...model, maybeSelectedStudioId: Option.some(studioId) },
                [],
            ],
            ClickedStudio: ({ studioId }) =>
                Option.match(findStudio(studioId), {
                    onNone: () => [model, []],
                    onSome: ({ lng, lat }) => [
                        {
                            ...model,
                            maybeSelectedStudioId: Option.some(studioId),
                        },
                        [
                            FlyTo({
                                maybeHostId: model.maybeMapHostId,
                                lng,
                                lat,
                                zoom: SELECTED_STUDIO_ZOOM,
                            }),
                        ],
                    ],
                }),
            DismissedStudio: () => [
                { ...model, maybeSelectedStudioId: Option.none() },
                [],
            ],
            UpdatedSearchQuery: ({ value }) => [
                { ...model, searchQuery: value },
                [],
            ],
            AddedArea: ({ areaId }) =>
                Array.contains(model.selectedAreaIds, areaId)
                    ? [model, []]
                    : withSelection(
                          model,
                          Array.append(model.selectedAreaIds, areaId)
                      ),
            RemovedArea: ({ areaId }) =>
                withSelection(
                    model,
                    Array.filter(
                        model.selectedAreaIds,
                        (id) => !Equal.equals(id, areaId)
                    )
                ),
            ClearedAreas: () => withSelection(model, []),
            SelectedRouteProfile: ({ profile }) => {
                const waypoints = studiosInAreas(model.selectedAreaIds)
                const nextModel: Model = {
                    ...model,
                    routeProfile: profile,
                    routeState: routeStateFor(waypoints.length),
                }

                return [
                    nextModel,
                    waypoints.length < 2 || waypoints.length > MAX_ROUTE_STUDIOS
                        ? []
                        : [
                              fetchRoute(
                                  Array.map(waypoints, ({ id }) => id),
                                  profile
                              ),
                          ],
                ]
            },
            LoadedSelection: ({ maybeAreaIds }) => {
                const areaIds = Option.getOrElse(
                    maybeAreaIds,
                    () => defaultAreaIds
                )
                const waypoints = studiosInAreas(areaIds)

                return [
                    {
                        ...model,
                        selectedAreaIds: areaIds,
                        routeState: routeStateFor(waypoints.length),
                    },
                    [
                        syncMarkers(model.maybeMapHostId, areaIds),
                        ...(waypoints.length < 2 ||
                        waypoints.length > MAX_ROUTE_STUDIOS
                            ? []
                            : [
                                  fetchRoute(
                                      Array.map(waypoints, ({ id }) => id),
                                      model.routeProfile
                                  ),
                              ]),
                    ],
                ]
            },
            SelectedMapStyle: ({ styleId }) => [
                { ...model, mapStyleId: styleId },
                [
                    setMapStyle(
                        model.maybeMapHostId,
                        styleId,
                        model.selectedAreaIds,
                        routeCoordinates(model)
                    ),
                ],
            ],
            CompletedSetMapStyle: () => [model, []],
            CompletedSaveSelection: () => [model, []],
            CompletedSyncMarkers: () => [model, []],
            SucceededFetchRoute: ({
                coordinates,
                distanceMeters,
                durationSeconds,
            }) => [
                {
                    ...model,
                    routeState: RouteLoaded({
                        coordinates,
                        distanceMeters,
                        durationSeconds,
                    }),
                },
                [drawRoute(model.maybeMapHostId, coordinates)],
            ],
            FailedFetchRoute: ({ reason }) => [
                { ...model, routeState: RouteFailed({ reason }) },
                [clearRoute(model.maybeMapHostId)],
            ],
            CompletedDrawRoute: () => [model, []],
            CompletedClearRoute: () => [model, []],
            DismissedGeolocate: () => [
                { ...model, geolocateState: GeolocateIdle() },
                [],
            ],
            // The control has already moved the camera by the time it
            // reports, so this only records where it landed.
            SucceededGeolocate: ({ lng, lat }) => [
                {
                    ...model,
                    maybeUserLocation: Option.some({ lng, lat }),
                    geolocateState: GeolocateIdle(),
                },
                [],
            ],
            FailedGeolocate: ({ reason }) => [
                { ...model, geolocateState: GeolocateFailed({ reason }) },
                [],
            ],
            SucceededFlyTo: () => [model, []],
            FailedFlyTo: () => [model, []],
            OpenedHelp: () => [{ ...model, isHelpOpen: true }, []],
            ClosedHelp: () => [{ ...model, isHelpOpen: false }, []],
            LoadedLocationNoticePreference: ({ isDismissed }) => [
                {
                    ...model,
                    suppressLocationNotice: isDismissed,
                    locationNoticeState: isDismissed
                        ? LocationNoticeHidden()
                        : LocationNoticeVisible(),
                },
                [],
            ],
            ToggledSuppressLocationNotice: ({ value }) => [
                { ...model, suppressLocationNotice: value },
                [],
            ],
            AcknowledgedLocationNotice: () => [
                { ...model, locationNoticeState: LocationNoticeHidden() },
                [saveLocationNoticePreference(model.suppressLocationNotice)],
            ],
            CompletedSaveLocationNoticePreference: () => [model, []],
            CompletedFocusSearchInput: () => [model, []],
        })
    )
