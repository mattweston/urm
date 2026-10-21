export const INITIAL_ZOOM = 11.5
export const INITIAL_CENTER_LNG = -2.181235
export const INITIAL_CENTER_LAT = 51.736333
export const SELECTED_STUDIO_ZOOM = 16

export const SEARCH_INPUT_ID = "interactive-map-search-input"

export const AREA_SOURCE_ID = "interactive-map-areas"
export const AREA_FILL_LAYER_ID = "interactive-map-area-fill"
export const AREA_LINE_LAYER_ID = "interactive-map-area-line"

// A selected valley is tinted enough to read as territory without fighting the
// pins on top of it; an unselected one is just barely present, so the shape is
// discoverable before it is picked.
export const AREA_FILL_OPACITY_SELECTED = 0.2
export const AREA_FILL_OPACITY_UNSELECTED = 0.04

export const ROUTE_SOURCE_ID = "interactive-map-route"
export const ROUTE_LINE_LAYER_ID = "interactive-map-route-line"
export const ROUTE_CASING_LAYER_ID = "interactive-map-route-casing"

export const ROUTE_LINE_COLOR = "#f84d4d"
export const ROUTE_CASING_COLOR = "#ffffff"

export const STORAGE_KEY = "urm-docs-interactive-map-areas"
export const LOCATION_NOTICE_STORAGE_KEY =
    "urm-docs-interactive-map-location-notice-dismissed"

// The Directions API takes at most 25 coordinates per request, which is why the
// original app's help text told people they could only route 25 studios at once.
export const MAX_ROUTE_STUDIOS = 25
