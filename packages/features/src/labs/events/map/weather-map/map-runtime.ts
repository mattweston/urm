import type { Map as MapInstance, Marker } from "mapbox-gl"

import "mapbox-gl/dist/mapbox-gl.css"

import type { Position } from "./weather.ts"

const MAP_STYLE_URL = "mapbox://styles/mapbox/outdoors-v12"
const MARKER_COLOR = "#f84d4d"
const INITIAL_ZOOM = 9

type MapEntry = Readonly<{ map: MapInstance; marker: Marker }>

const entries = new Map<string, MapEntry>()
const ENTRY_KEY = "weather-map"

const access_token = (): string =>
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""

export type MountResult =
    | Readonly<{ kind: "mounted" }>
    | Readonly<{ kind: "failed"; reason: string }>

export const mount_weather_map = async (
    element: HTMLElement,
    initial: Position,
    on_moved: (position: Position) => void
): Promise<MountResult> => {
    const token = access_token()

    if (token.trim().length === 0) {
        return {
            kind: "failed",
            reason: "Missing Mapbox access token. Set VITE_MAPBOX_ACCESS_TOKEN.",
        }
    }

    try {
        const mapbox = await import("mapbox-gl")

        const map = new mapbox.default.Map({
            accessToken: token,
            container: element,
            style: MAP_STYLE_URL,
            center: [initial.lng, initial.lat],
            zoom: INITIAL_ZOOM,
            performanceMetricsCollection: false,
        })

        map.addControl(new mapbox.default.NavigationControl(), "top-right")

        const marker = new mapbox.default.Marker({
            color: MARKER_COLOR,
            draggable: true,
        })
            .setLngLat([initial.lng, initial.lat])
            .addTo(map)

        // Only on dragend, not on every frame of the drag: each report is a
        // request for somewhere new, and reporting continuously would fire one
        // per pixel travelled.
        marker.on("dragend", () => {
            const { lng, lat } = marker.getLngLat()
            on_moved({ lng, lat })
        })

        // Clicking is the other way to ask, and saves dragging across a county.
        map.on("click", (event) => {
            const { lng, lat } = event.lngLat
            marker.setLngLat([lng, lat])
            on_moved({ lng, lat })
        })

        entries.set(ENTRY_KEY, { map, marker })

        return { kind: "mounted" }
    } catch {
        return { kind: "failed", reason: "Map host could not be initialized." }
    }
}

export const unmount_weather_map = (): void => {
    entries.get(ENTRY_KEY)?.map.remove()
    entries.delete(ENTRY_KEY)
}
