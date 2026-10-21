import { Function, Option } from "effect"
import type { Map as MapInstance } from "maplibre-gl"

const mapsByHostId = new Map<string, MapInstance>()

export const HOST_ID = "map-host"

export const setMap = (hostId: string, instance: MapInstance): void => {
    mapsByHostId.set(hostId, instance)
}

export const getMap = (hostId: string): Option.Option<MapInstance> =>
    Option.fromNullishOr(mapsByHostId.get(hostId))

export const removeMap = (hostId: string): void =>
    Option.match(getMap(hostId), {
        onNone: Function.constVoid,
        onSome: (map) => {
            map.remove()
            mapsByHostId.delete(hostId)
        },
    })
