import { Effect } from "effect"

import { RoutePlanError } from "../errors.ts"

const RESERVED_SEGMENTS = new Set(["api", "assets", "sitegen", "urm"])
const ROUTE_SEGMENT = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const invalidPath = (path: string, reason: string) =>
    Effect.fail(new RoutePlanError({ path, reason }))

export const outputPathFor = (
    path: string
): Effect.Effect<string, RoutePlanError> => {
    if (path === "/") {
        return Effect.succeed("index.html")
    }

    if (path === "/404.html") {
        return Effect.succeed("404.html")
    }

    if (!path.startsWith("/") || !path.endsWith("/")) {
        return invalidPath(
            path,
            "Routes must be absolute and use one canonical trailing slash"
        )
    }

    if (
        path.includes("?") ||
        path.includes("#") ||
        path.includes("\\") ||
        path.includes("%") ||
        path.includes("//")
    ) {
        return invalidPath(path, "Route contains a non-canonical character")
    }

    const segments = path.slice(1, -1).split("/")
    const invalidSegment = segments.find(
        (segment) => !ROUTE_SEGMENT.test(segment)
    )

    if (invalidSegment !== undefined) {
        return invalidPath(path, `Invalid route segment "${invalidSegment}"`)
    }

    const firstSegment = segments[0]
    if (firstSegment !== undefined && RESERVED_SEGMENTS.has(firstSegment)) {
        return invalidPath(path, `Reserved route prefix "${firstSegment}"`)
    }

    return Effect.succeed(`${segments.join("/")}/index.html`)
}
