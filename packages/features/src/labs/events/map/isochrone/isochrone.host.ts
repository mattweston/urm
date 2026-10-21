import { Function, Option } from "effect"
import type { Map as MapInstance, Marker } from "mapbox-gl"

type MapEntry = Readonly<{
    map: MapInstance
    originMarker: Marker
}>

const entriesByHostId = new Map<string, MapEntry>()

// Set by the subscription, called by the studio markers the Mount builds.
type StudioHandler = (studioId: string) => void

const handlersByHostId = new Map<string, StudioHandler>()

export const HOST_ID = "isochrone-host"

export const setEntry = (hostId: string, entry: MapEntry): void => {
    entriesByHostId.set(hostId, entry)
}

export const getEntry = (hostId: string): Option.Option<MapEntry> =>
    Option.fromNullishOr(entriesByHostId.get(hostId))

export const setStudioHandler = (
    hostId: string,
    handler: StudioHandler
): void => {
    handlersByHostId.set(hostId, handler)
}

export const clearStudioHandler = (hostId: string): void => {
    handlersByHostId.delete(hostId)
}

export const notifyStudioClicked = (hostId: string, studioId: string): void => {
    handlersByHostId.get(hostId)?.(studioId)
}

export const removeEntry = (hostId: string): void =>
    Option.match(getEntry(hostId), {
        onNone: Function.constVoid,
        onSome: ({ map }) => {
            map.remove()
            entriesByHostId.delete(hostId)
            handlersByHostId.delete(hostId)
        },
    })
