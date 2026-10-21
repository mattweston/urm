import { Array, Equal, Match as M, Option } from "effect"
import { Command } from "foldkit"
import {
    FlyTo,
    FocusSearchInput,
    Geolocate,
    LockBodyScroll,
    UnlockBodyScroll,
} from "./map.command.ts"
import { SELECTED_LOCATION_ZOOM, USER_LOCATION_ZOOM } from "./map.constant.ts"
import { type Location } from "./map.location.ts"
import type { Message } from "./map.message.ts"
import type { Model } from "./map.model.ts"
import {
    GeolocateFailed,
    GeolocateIdle,
    GeolocateLocating,
    initialModel,
} from "./map.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const findLocation = (
    model: Model,
    locationId: string
): Option.Option<Location> =>
    Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const init = (): UpdateReturn => [initialModel, [FocusSearchInput()]]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId }) => [
                {
                    ...model,
                    maybeMapHostId: Option.some(hostId),
                },
                [],
            ],
            FailedMountMap: ({ reason }) => [
                {
                    ...model,
                    maybeMapError: Option.some(reason),
                },
                [],
            ],
            MovedMap: ({ bounds }) => [
                {
                    ...model,
                    maybeBounds: Option.some(bounds),
                },
                [],
            ],
            ClickedMarker: ({ locationId }) => [
                {
                    ...model,
                    maybeSelectedLocationId: Option.some(locationId),
                },
                [],
            ],
            ClickedLocation: ({ locationId }) =>
                Option.match(findLocation(model, locationId), {
                    onNone: () => [model, []],
                    onSome: ({ lng, lat }) => [
                        {
                            ...model,
                            maybeSelectedLocationId: Option.some(locationId),
                        },
                        [
                            FlyTo({
                                maybeHostId: model.maybeMapHostId,
                                lng,
                                lat,
                                zoom: SELECTED_LOCATION_ZOOM,
                            }),
                        ],
                    ],
                }),
            UpdatedSearchQuery: ({ value }) => [
                {
                    ...model,
                    searchQuery: value,
                },
                [],
            ],
            ClickedFindMe: () => [
                {
                    ...model,
                    geolocateState: GeolocateLocating(),
                },
                [LockBodyScroll(), Geolocate()],
            ],
            DismissedGeolocate: () => [
                {
                    ...model,
                    geolocateState: GeolocateIdle(),
                },
                [UnlockBodyScroll()],
            ],
            SucceededGeolocate: ({ lng, lat }) => [
                {
                    ...model,
                    maybeUserLocation: Option.some({ lng, lat }),
                    geolocateState: GeolocateIdle(),
                },
                [
                    UnlockBodyScroll(),
                    FlyTo({
                        maybeHostId: model.maybeMapHostId,
                        lng,
                        lat,
                        zoom: USER_LOCATION_ZOOM,
                    }),
                ],
            ],
            FailedGeolocate: ({ reason }) => [
                {
                    ...model,
                    geolocateState: GeolocateFailed({ reason }),
                },
                [],
            ],
            SucceededFlyTo: () => [model, []],
            FailedFlyTo: () => [model, []],
            CompletedFocusSearchInput: () => [model, []],
            CompletedLockBodyScroll: () => [model, []],
            CompletedUnlockBodyScroll: () => [model, []],
        })
    )
