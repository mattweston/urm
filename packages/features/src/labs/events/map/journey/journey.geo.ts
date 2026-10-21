// The template reaches for turf's lineDistance and along to find the point at a
// given fraction of the path. Both are a walk over the coordinates with a
// haversine between each pair, which is little enough to keep here rather than
// take on a dependency for.

const EARTH_RADIUS_M = 6371008.8

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export const distanceBetween = (
    [lngA, latA]: readonly [number, number],
    [lngB, latB]: readonly [number, number]
): number => {
    const deltaLat = toRadians(latB - latA)
    const deltaLng = toRadians(lngB - lngA)
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(latA)) *
            Math.cos(toRadians(latB)) *
            Math.sin(deltaLng / 2) ** 2

    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export const pathLength = (
    coordinates: ReadonlyArray<readonly [number, number]>
): number =>
    coordinates.reduce((total, point, index) => {
        const previous = coordinates[index - 1]

        return previous === undefined
            ? total
            : total + distanceBetween(previous, point)
    }, 0)

// The point a given fraction along the path, interpolated within whichever
// segment that fraction lands in — so the camera moves evenly rather than
// hopping from vertex to vertex.
export const pointAlong = (
    coordinates: ReadonlyArray<readonly [number, number]>,
    fraction: number
): readonly [number, number] => {
    const first = coordinates[0]

    if (first === undefined) {
        return [0, 0]
    }

    const target = pathLength(coordinates) * Math.min(Math.max(fraction, 0), 1)
    let travelled = 0

    for (let index = 1; index < coordinates.length; index = index + 1) {
        const previous = coordinates[index - 1]
        const current = coordinates[index]

        if (previous === undefined || current === undefined) {
            break
        }

        const segment = distanceBetween(previous, current)

        if (travelled + segment >= target) {
            const within = segment === 0 ? 0 : (target - travelled) / segment

            return [
                previous[0] + (current[0] - previous[0]) * within,
                previous[1] + (current[1] - previous[1]) * within,
            ]
        }

        travelled = travelled + segment
    }

    return coordinates[coordinates.length - 1] ?? first
}
