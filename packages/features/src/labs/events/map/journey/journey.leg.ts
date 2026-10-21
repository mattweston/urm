// The journey is a fixed drive rather than something the user assembles: out of
// Stroud and up the Slad valley to The Camp. The studio order comes from the
// interactive-map data, so the two demos describe the same trail.

import {
    studiosInArea,
    type Studio,
} from "../interactive-map/interactive-map.studio.ts"

export const journeyTitle = "Stroud to The Camp"
export const journeySubtitle =
    "Out of the town centre and up the Slad valley, one studio at a time."

// Fifteen stops, comfortably inside the Directions API's 25-coordinate limit.
export const journeyStudios: ReadonlyArray<Studio> = [
    ...studiosInArea("town-centre"),
    ...studiosInArea("slad"),
]
