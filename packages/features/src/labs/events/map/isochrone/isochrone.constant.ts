export const MAP_STYLE_URL = "mapbox://styles/mapbox/light-v11"

export const ISOCHRONE_SOURCE_ID = "isochrone-bands"
export const ISOCHRONE_FILL_LAYER_ID = "isochrone-band-fill"
export const ISOCHRONE_LINE_LAYER_ID = "isochrone-band-line"

// The Isochrone API takes at most four contours per request. Three reads
// clearly at this scale; a fourth band mostly overlaps the third.
export const CONTOUR_MINUTES: ReadonlyArray<number> = [5, 10, 15]

// Passed to the API as contours_colors so the bands come back already carrying
// the colours the legend uses, rather than being recoloured here.
export const CONTOUR_COLORS: ReadonlyArray<string> = [
    "1d7a4b",
    "f79640",
    "7753eb",
]

export const BAND_FILL_OPACITY = 0.2
export const ORIGIN_MARKER_COLOR = "#f84d4d"
export const STUDIO_MARKER_COLOR = "#40546a"

// Douglas-Peucker tolerance in metres. Mapbox's own script exposes this because
// an un-generalized isochrone can self-intersect; a small value keeps the
// outline smooth without that risk.
export const GENERALIZE_METRES = 50
