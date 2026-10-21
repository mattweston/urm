import type { ExpressionSpecification, Map as MapInstance } from "mapbox-gl"
import {
    AREA_FILL_LAYER_ID,
    AREA_FILL_OPACITY_SELECTED,
    AREA_FILL_OPACITY_UNSELECTED,
    AREA_LINE_LAYER_ID,
    AREA_SOURCE_ID,
    ROUTE_CASING_COLOR,
    ROUTE_CASING_LAYER_ID,
    ROUTE_LINE_COLOR,
    ROUTE_LINE_LAYER_ID,
    ROUTE_SOURCE_ID,
} from "./interactive-map.constant.ts"
import { areaShapes } from "./interactive-map.shape.ts"
import { routeGroups, type RouteGroupId } from "./interactive-map.studio.ts"

// Data-driven opacity against the selected area ids, rather than the original's
// loop that added one unfiltered fill layer per polygon — six layers each
// drawing all six shapes.
const fillOpacityExpression = (
    selectedAreaIds: ReadonlyArray<RouteGroupId>
): ExpressionSpecification => [
    "case",
    ["in", ["get", "areaId"], ["literal", [...selectedAreaIds]]],
    AREA_FILL_OPACITY_SELECTED,
    AREA_FILL_OPACITY_UNSELECTED,
]

export const setSelectedAreas = (
    map: MapInstance,
    selectedAreaIds: ReadonlyArray<RouteGroupId>
): void => {
    if (map.getLayer(AREA_FILL_LAYER_ID) === undefined) {
        return
    }

    map.setPaintProperty(
        AREA_FILL_LAYER_ID,
        "fill-opacity",
        fillOpacityExpression(selectedAreaIds)
    )
}

// Changing the basemap discards every source and layer on it, so this runs at
// mount and again after each style swap. Markers are DOM overlays and survive
// on their own. Area names are not drawn on the map — the sidebar lists them.
export const addSourcesAndLayers = (map: MapInstance): void => {
    map.addSource(AREA_SOURCE_ID, {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: areaShapes.map(({ areaId, ring }) => {
                const color = routeGroups.find(
                    (group) => group.id === areaId
                )?.color

                return {
                    type: "Feature" as const,
                    properties: {
                        areaId,
                        color: color ?? ROUTE_LINE_COLOR,
                    },
                    geometry: {
                        type: "Polygon" as const,
                        coordinates: [ring.map(([lng, lat]) => [lng, lat])],
                    },
                }
            }),
        },
    })

    // Beneath everything else, so pins and the route stay legible over it.
    map.addLayer({
        id: AREA_FILL_LAYER_ID,
        type: "fill",
        source: AREA_SOURCE_ID,
        paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": AREA_FILL_OPACITY_UNSELECTED,
        },
    })

    map.addLayer({
        id: AREA_LINE_LAYER_ID,
        type: "line",
        source: AREA_SOURCE_ID,
        paint: {
            // The original outlined every shape in black; taking the colour
            // from the feature keeps a boundary tied to its area.
            "line-color": ["get", "color"],
            "line-width": 1.5,
            "line-opacity": 0.5,
        },
    })

    map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
    })

    // Casing first so it paints beneath the line and reads as an outline, which
    // is what the original was reaching for when it set
    // `directions-route-line-alt` to a contrasting colour.
    map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_CASING_COLOR, "line-width": 10 },
    })

    map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_LINE_COLOR, "line-width": 6 },
    })
}

export const setRouteLineData = (
    map: MapInstance,
    coordinates: ReadonlyArray<readonly [number, number]>
): void => {
    const source = map.getSource(ROUTE_SOURCE_ID)

    if (source === undefined || source.type !== "geojson") {
        return
    }

    source.setData({
        type: "FeatureCollection",
        features:
            coordinates.length === 0
                ? []
                : [
                      {
                          type: "Feature",
                          properties: {},
                          geometry: {
                              type: "LineString",
                              coordinates: coordinates.map(([lng, lat]) => [
                                  lng,
                                  lat,
                              ]),
                          },
                      },
                  ],
    })
}
