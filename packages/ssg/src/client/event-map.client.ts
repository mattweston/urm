/// <reference lib="dom" />
/// <reference types="vite/client" />

import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

export const mount_event_map = (
    host: HTMLElement,
    token: string,
    longitude: number,
    latitude: number
): void => {
    const map = new mapboxgl.Map({
        accessToken: token,
        container: host,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [longitude, latitude],
        zoom: 13,
        performanceMetricsCollection: false,
    })

    new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([longitude, latitude])
        .addTo(map)
}
