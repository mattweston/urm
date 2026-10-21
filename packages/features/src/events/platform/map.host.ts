import { Function, Option } from "effect"
import type { LngLatLike } from "mapbox-gl"

type EventMapLike = {
    on: (
        event: "click",
        handler: (event: {
            readonly lngLat: { readonly lng: number; readonly lat: number }
        }) => void
    ) => void
    off: (
        event: "click",
        handler: (event: {
            readonly lngLat: { readonly lng: number; readonly lat: number }
        }) => void
    ) => void
    remove: () => void
}

type EventMarkerLike = {
    on: (event: "dragend", handler: () => void) => void
    off: (event: "dragend", handler: () => void) => void
    setLngLat: (lngLat: LngLatLike) => unknown
    getLngLat: () => { readonly lng: number; readonly lat: number }
    remove: () => void
}

export const eventMapHostId = (routeKey: string) =>
    `events-event-map-${routeKey}`

type EventMapHandle = {
    readonly map: EventMapLike
    readonly marker: EventMarkerLike
}

const mapsByHostId = new Map<string, EventMapHandle>()

export const setEventMap = (
    hostId: string,
    map: EventMapLike,
    marker: EventMarkerLike
): void => {
    mapsByHostId.set(hostId, { map, marker })
}

export const getEventMap = (hostId: string): Option.Option<EventMapHandle> =>
    Option.fromNullishOr(mapsByHostId.get(hostId))

export const removeEventMap = (hostId: string): void =>
    Option.match(getEventMap(hostId), {
        onNone: Function.constVoid,
        onSome: ({ map, marker }) => {
            marker.remove()
            map.remove()
            mapsByHostId.delete(hostId)
        },
    })
