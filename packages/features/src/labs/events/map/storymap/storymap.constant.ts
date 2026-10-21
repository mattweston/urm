// Outdoors rather than a flat basemap: the valleys are the subject, so relief
// and contours matter more than road hierarchy.
export const MAP_STYLE_URL = "mapbox://styles/mapbox/outdoors-v12"
export const INSET_STYLE_URL = "mapbox://styles/mapbox/satellite-v9"

export const MARKER_COLOR = "#3fb1ce"
export const INSET_MARKER_COLOR = "#f97316"
export const INSET_ZOOM = 3.2

// The template's `use3dTerrain`, which it left off by default. Five valleys
// seen at a 60° pitch are the whole point here, and flat terrain would show
// none of them.
export const TERRAIN_SOURCE_ID = "mapbox-dem"
export const TERRAIN_EXAGGERATION = 1.5
export const SKY_LAYER_ID = "sky"

// scrollama's `offset: 0.5` fires a step as it crosses the middle of the
// viewport. An IntersectionObserver root inset to a zero-height band on that
// line is the same trigger without the library.
export const CHAPTER_ROOT_MARGIN = "-50% 0px -50% 0px"

// One duration for every chapter, rather than mapbox deriving it from distance:
// the valleys are unevenly spaced, and a move whose length tracks the gap makes
// the story feel like it speeds up and slows down at random.
export const CAMERA_DURATION_MS = 2600

// easeInOutCubic. Mapbox's default easing starts and stops harder, which reads
// as a jolt at both ends of a short move.
export const cameraEasing = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// The original turns 180° over half a minute, linearly, once the move lands.
export const ROTATION_DEGREES = 180
export const ROTATION_DURATION_MS = 30000
