export const MAP_STYLE_URL = "mapbox://styles/mapbox/outdoors-v12"

export const ROUTE_SOURCE_ID = "journey-route"
export const ROUTE_LINE_LAYER_ID = "journey-route-line"
export const ROUTE_CASING_LAYER_ID = "journey-route-casing"

export const ROUTE_LINE_COLOR = "#f84d4d"
export const ROUTE_CASING_COLOR = "#ffffff"
export const ROUTE_SPENT_COLOR = "rgba(0, 0, 0, 0)"

export const TERRAIN_SOURCE_ID = "mapbox-dem"
export const TERRAIN_EXAGGERATION = 1.4
export const SKY_LAYER_ID = "sky"

// How high the following camera rides, and how far it tips over. Altitude is
// metres above sea level, and the valley floors here sit around 60-200 m, so
// this rides roughly 400-540 m above the ground.
//
// There is a floor here, and it is set by TERRAIN_EXAGGERATION rather than by
// the real hills: at 1.4x the tops around Slad render near 390 m rather than
// their actual 280 m, so dropping much below this starts flying the camera
// through hillsides. Going lower means easing the exaggeration first.
//
// Pitch does as much work as altitude: past 65 degrees the camera looks along
// the valley rather than down into it, which is what puts the sides and the
// horizon in frame. Raising it also pushes the camera further back — the
// trigonometry divides by tan(90 - pitch) — so the two are tuned together.
export const CAMERA_ALTITUDE_M = 600
export const CAMERA_PITCH = 76

// Degrees swept across the whole run. The template turns a full 200°, which at
// this scale spins faster than the drive reads; a quarter turn keeps the valley
// oriented while still moving.
export const CAMERA_BEARING_SWEEP = 90
export const CAMERA_START_BEARING = 10

// Lower is smoother and laggier. The template uses 0.95 — the camera trails the
// leading edge by enough to keep it in shot without snapping to every vertex.
export const CAMERA_SMOOTHING = 0.95

// Lengthened alongside the lower camera: the same route covers more of the
// screen per second when it is closer, so the old 24 s read as a rush.
export const JOURNEY_DURATION_MS = 32000
export const INTRO_DURATION_MS = 4000
