// Whether a studio falls inside a band is answered here rather than by asking
// the map: the isochrone polygons are already in the Model, and a ray cast over
// a ring is cheaper than a round trip through queryRenderedFeatures — which
// would also only ever see the part of a band currently on screen.

export type Ring = ReadonlyArray<readonly [number, number]>

// Ray casting: count how many edges a ray from the point crosses. Odd means
// inside. Rings from the API are closed, so the wrap-around pairing is what
// closes the loop.
export const isPointInRing = (
    [lng, lat]: readonly [number, number],
    ring: Ring
): boolean => {
    let inside = false

    for (
        let index = 0, previous = ring.length - 1;
        index < ring.length;
        previous = index, index = index + 1
    ) {
        const current = ring[index]
        const last = ring[previous]

        if (current === undefined || last === undefined) {
            continue
        }

        const [currentLng, currentLat] = current
        const [lastLng, lastLat] = last

        const straddles = currentLat > lat !== lastLat > lat

        if (!straddles) {
            continue
        }

        const crossingLng =
            ((lastLng - currentLng) * (lat - currentLat)) /
                (lastLat - currentLat) +
            currentLng

        if (lng < crossingLng) {
            inside = !inside
        }
    }

    return inside
}

// A polygon is an outer ring followed by any holes, so a point counts only if
// it is inside the outer ring and outside every hole.
export const isPointInPolygon = (
    point: readonly [number, number],
    rings: ReadonlyArray<Ring>
): boolean => {
    const outer = rings[0]

    if (outer === undefined || !isPointInRing(point, outer)) {
        return false
    }

    return rings.slice(1).every((hole) => !isPointInRing(point, hole))
}
