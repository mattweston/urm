// The valley outlines from the vanilla app's data/multipolygon.js. scripts/map.js
// built them at lines 167-196 and then commented the whole block out, so the
// original shipped without them.
//
// There, a polygon's only property was its colour, which is also how it was
// matched to anything. Here each one carries the area id it belongs to and the
// colour is looked up from the area — the same move that replaced studio titles
// with ids.
//
// These are schematic: a pentagon over the town centre and five wedges running
// out to a bounding box, not surveyed valley boundaries. They read as territory
// at low zoom and should not be taken for topography.

import type { RouteGroupId } from "./interactive-map.studio.ts"

export type AreaShape = Readonly<{
    areaId: RouteGroupId
    ring: ReadonlyArray<readonly [number, number]>
}>

export const areaShapes: ReadonlyArray<AreaShape> = [
    {
        areaId: "town-centre",
        ring: [
            [-2.217850418218603, 51.74107023834362],
            [-2.223084174810481, 51.745370277385945],
            [-2.220203207878683, 51.74711993736873],
            [-2.214924597164244, 51.74534944307196],
            [-2.214825402940761, 51.74251835473324],
            [-2.217850418218603, 51.74107023834362],
        ],
    },
    {
        areaId: "nailsworth",
        ring: [
            [-2.217850418218603, 51.74107023834362],
            [-2.223084174810481, 51.745370277385945],
            [-2.325, 51.727967],
            [-2.325, 51.6875],
            [-2.206785, 51.6875],
            [-2.217850418218603, 51.74107023834362],
        ],
    },
    {
        areaId: "vale",
        ring: [
            [-2.220203207878683, 51.74711993736873],
            [-2.223084174810481, 51.745370277385945],
            [-2.325, 51.727967],
            [-2.325, 51.79],
            [-2.2477, 51.79],
            [-2.220203207878683, 51.74711993736873],
        ],
    },
    {
        areaId: "slad",
        ring: [
            [-2.220203207878683, 51.74711993736873],
            [-2.2477, 51.79],
            [-2.1, 51.79],
            [-2.214924597164244, 51.74534944307196],
            [-2.220203207878683, 51.74711993736873],
        ],
    },
    {
        areaId: "bisley",
        ring: [
            [-2.214924597164244, 51.74534944307196],
            [-2.1, 51.79],
            [-2.1, 51.733189],
            [-2.214825402940761, 51.74251835473324],
            [-2.214924597164244, 51.74534944307196],
        ],
    },
    {
        areaId: "golden-valley",
        ring: [
            [-2.214825402940761, 51.74251835473324],
            [-2.217850418218603, 51.74107023834362],
            [-2.206785, 51.6875],
            [-2.1, 51.6875],
            [-2.1, 51.733189],
            [-2.214825402940761, 51.74251835473324],
        ],
    },
]
