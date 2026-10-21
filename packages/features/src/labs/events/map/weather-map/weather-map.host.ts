import { Function, Option } from "effect"
import type { Map as MapInstance } from "mapbox-gl"
import type { Position } from "./weather.ts"

const mapsByHostId = new Map<string, MapInstance>()
const moveHandlersByHostId = new Map<string, (position: Position) => void>()

export const HOST_ID = "weather-map-host"

export const setMap = (hostId: string, map: MapInstance): void => {
    mapsByHostId.set(hostId, map)
}

export const emitMoved = (hostId: string, position: Position): void => {
    moveHandlersByHostId.get(hostId)?.(position)
}

export const setMoveHandler = (
    hostId: string,
    handler: (position: Position) => void
): void => {
    moveHandlersByHostId.set(hostId, handler)
}

export const clearMoveHandler = (hostId: string): void => {
    moveHandlersByHostId.delete(hostId)
}

export const removeMap = (hostId: string): void =>
    Option.match(Option.fromNullishOr(mapsByHostId.get(hostId)), {
        onNone: Function.constVoid,
        onSome: (map) => {
            map.remove()
            mapsByHostId.delete(hostId)
            moveHandlersByHostId.delete(hostId)
        },
    })
