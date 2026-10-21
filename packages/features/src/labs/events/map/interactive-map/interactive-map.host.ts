import { Function, Option } from "effect"
import type { GeolocateControl, Map as MapInstance, Marker } from "mapbox-gl"
import type { RouteGroupId } from "./interactive-map.studio.ts"

export type MarkerEntry = Readonly<{
    studioId: string
    areaId: RouteGroupId
    marker: Marker
}>

// Everything the map owns imperatively but the Model needs to hear about. The
// subscription installs these once and the Mount never has to know that
// Messages exist.
export type EventHandlers = Readonly<{
    onStudioClick: (studioId: string) => void
    onGeolocate: (lng: number, lat: number) => void
    onGeolocateError: (reason: string) => void
}>

const mapsByHostId = new Map<string, MapInstance>()
const geolocateControlsByHostId = new Map<string, GeolocateControl>()

// Markers are built once at mount and then added to or taken off the map as
// areas are ticked, so they are held here beside the map instance rather than
// rebuilt on every selection change.
const markersByHostId = new Map<string, ReadonlyArray<MarkerEntry>>()
const shownStudioIdsByHostId = new Map<string, Set<string>>()
const handlersByHostId = new Map<string, EventHandlers>()

export const HOST_ID = "interactive-map-host"

export const setMap = (hostId: string, instance: MapInstance): void => {
    mapsByHostId.set(hostId, instance)
}

export const getMap = (hostId: string): Option.Option<MapInstance> =>
    Option.fromNullishOr(mapsByHostId.get(hostId))

export const setGeolocateControl = (
    hostId: string,
    control: GeolocateControl
): void => {
    geolocateControlsByHostId.set(hostId, control)
}

export const setEventHandlers = (
    hostId: string,
    handlers: EventHandlers
): void => {
    handlersByHostId.set(hostId, handlers)

    const control = geolocateControlsByHostId.get(hostId)

    if (control === undefined) {
        return
    }

    control.on("geolocate", (position) => {
        handlers.onGeolocate(
            position.coords.longitude,
            position.coords.latitude
        )
    })

    control.on("error", (error) => {
        handlers.onGeolocateError(
            error.message.length > 0
                ? error.message
                : "Could not read your location."
        )
    })
}

export const clearEventHandlers = (hostId: string): void => {
    handlersByHostId.delete(hostId)
}

export const setMarkers = (
    hostId: string,
    entries: ReadonlyArray<MarkerEntry>
): void => {
    markersByHostId.set(hostId, entries)
    shownStudioIdsByHostId.set(hostId, new Set())

    // Bound once to an element that outlives every add and remove, so markers
    // going on and off the map never need rebinding. A marker already knows
    // which studio it is, so nothing has to be recovered from the DOM.
    entries.forEach(({ studioId, marker }) => {
        marker.getElement().addEventListener("click", (event) => {
            event.stopPropagation()
            handlersByHostId.get(hostId)?.onStudioClick(studioId)
        })
    })
}

// Adding a marker that is already on the map, or removing one that is not, both
// work — but they detach and reattach the element, so the shown set is kept to
// leave untouched areas alone.
export const showMarkersForAreas = (
    hostId: string,
    areaIds: ReadonlyArray<RouteGroupId>
): void =>
    Option.match(getMap(hostId), {
        onNone: Function.constVoid,
        onSome: (map) => {
            const entries = markersByHostId.get(hostId) ?? []
            const shownStudioIds =
                shownStudioIdsByHostId.get(hostId) ?? new Set<string>()

            entries.forEach(({ studioId, areaId, marker }) => {
                const shouldShow = areaIds.includes(areaId)
                const isShown = shownStudioIds.has(studioId)

                if (shouldShow && !isShown) {
                    marker.addTo(map)
                    shownStudioIds.add(studioId)
                    return
                }

                if (!shouldShow && isShown) {
                    marker.remove()
                    shownStudioIds.delete(studioId)
                }
            })

            shownStudioIdsByHostId.set(hostId, shownStudioIds)
        },
    })

export const removeMap = (hostId: string): void =>
    Option.match(getMap(hostId), {
        onNone: Function.constVoid,
        onSome: (map) => {
            ;(markersByHostId.get(hostId) ?? []).forEach(({ marker }) =>
                marker.remove()
            )
            markersByHostId.delete(hostId)
            shownStudioIdsByHostId.delete(hostId)
            handlersByHostId.delete(hostId)
            geolocateControlsByHostId.delete(hostId)
            map.remove()
            mapsByHostId.delete(hostId)
        },
    })
