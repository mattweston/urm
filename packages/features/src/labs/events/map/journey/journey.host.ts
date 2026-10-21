import { Function, Option } from "effect"
import type { Map as MapInstance } from "mapbox-gl"

// The free camera needs MercatorCoordinate, which lives on the mapbox module
// rather than the map instance, so the module is kept beside the map instead of
// imported again where the animation runs.
type MapEntry = Readonly<{
    map: MapInstance
    MercatorCoordinate: typeof import("mapbox-gl").MercatorCoordinate
}>

const entriesByHostId = new Map<string, MapEntry>()

// A running animation is a frame loop, so it needs a way to be told to stop:
// starting a second run, or unmounting mid-flight, must not leave the first one
// driving the camera.
const runTokensByHostId = new Map<string, number>()

// The camera trails its own previous frame, so the smoothing state has the same
// lifetime as the run: starting or cancelling one clears it.
const cameraPositionsByHostId = new Map<string, { lng: number; lat: number }>()

export const HOST_ID = "journey-host"

export const setEntry = (hostId: string, entry: MapEntry): void => {
    entriesByHostId.set(hostId, entry)
}

export const getEntry = (hostId: string): Option.Option<MapEntry> =>
    Option.fromNullishOr(entriesByHostId.get(hostId))

export const beginRun = (hostId: string): number => {
    const token = (runTokensByHostId.get(hostId) ?? 0) + 1
    runTokensByHostId.set(hostId, token)
    cameraPositionsByHostId.delete(hostId)

    return token
}

export const getCameraPosition = (
    hostId: string
): Option.Option<{ lng: number; lat: number }> =>
    Option.fromNullishOr(cameraPositionsByHostId.get(hostId))

export const setCameraPosition = (
    hostId: string,
    position: { lng: number; lat: number }
): void => {
    cameraPositionsByHostId.set(hostId, position)
}

export const isCurrentRun = (hostId: string, token: number): boolean =>
    runTokensByHostId.get(hostId) === token

export const cancelRun = (hostId: string): void => {
    runTokensByHostId.set(hostId, (runTokensByHostId.get(hostId) ?? 0) + 1)
    cameraPositionsByHostId.delete(hostId)
}

export const removeEntry = (hostId: string): void =>
    Option.match(getEntry(hostId), {
        onNone: Function.constVoid,
        onSome: ({ map }) => {
            cancelRun(hostId)
            runTokensByHostId.delete(hostId)
            map.remove()
            entriesByHostId.delete(hostId)
        },
    })
