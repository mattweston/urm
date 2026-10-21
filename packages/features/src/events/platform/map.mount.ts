import { Effect } from "effect"
import { Mount } from "foldkit"

import "mapbox-gl/dist/mapbox-gl.css"

import { FailedMountEventMap, SucceededMountEventMap } from "./map.message.ts"
import { removeEventMap, setEventMap } from "./map.host.ts"

interface MapMountFailure {
    readonly message: string
    readonly cause: unknown
}

const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : globalThis.String(error)

const mapMountFailure = (
    operation: string,
    cause: unknown
): MapMountFailure => ({
    message: `${operation}: ${describeError(cause)}`,
    cause,
})

const getBundledMapboxAccessToken = (): string => {
    const tokenFromDocument =
        document
            .querySelector('meta[name="urm-mapbox-access-token"]')
            ?.getAttribute("content") ?? ""

    if (
        tokenFromDocument.trim().length > 0 &&
        !tokenFromDocument.startsWith("%VITE_")
    ) {
        return tokenFromDocument
    }

    return import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
}

const getMapboxAccessToken = async (): Promise<string> => {
    const bundledAccessToken = getBundledMapboxAccessToken()

    if (bundledAccessToken.trim().length > 0) {
        return bundledAccessToken
    }

    try {
        const response = await fetch("/runtime-config.json")
        if (!response.ok) {
            return ""
        }

        const configuration: unknown = await response.json()
        if (
            typeof configuration !== "object" ||
            configuration === null ||
            !("mapboxAccessToken" in configuration) ||
            typeof configuration.mapboxAccessToken !== "string"
        ) {
            return ""
        }

        return configuration.mapboxAccessToken
    } catch {
        return ""
    }
}

export const mountEventMap = (
    hostId: string,
    centerLng: number,
    centerLat: number,
    editable = true
) =>
    Mount.define("MountEventMap", {
        messages: [SucceededMountEventMap, FailedMountEventMap],
        execute: ({ element }) => {
            return Effect.acquireRelease(
                Effect.gen(function* () {
                    if (!(element instanceof HTMLElement)) {
                        return {
                            message: FailedMountEventMap({
                                reason: "Map host is not an HTMLElement.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const accessToken =
                        yield* Effect.tryPromise(getMapboxAccessToken)
                    if (accessToken.length === 0) {
                        return {
                            message: FailedMountEventMap({
                                reason: "Missing Mapbox access token.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    const mapboxModule = yield* Effect.tryPromise({
                        try: () => import("mapbox-gl"),
                        catch: (error) =>
                            mapMountFailure(
                                "Mapbox module could not load",
                                error
                            ),
                    })

                    const { map, marker } = yield* Effect.try({
                        try: () => {
                            const map = new mapboxModule.default.Map({
                                accessToken,
                                container: element,
                                style: "mapbox://styles/mapbox/streets-v12",
                                center: [centerLng, centerLat],
                                zoom: 4,
                                performanceMetricsCollection: false,
                            })

                            const marker = new mapboxModule.default.Marker({
                                draggable: editable,
                                color: "#ef4444", // TODO: vars
                            })
                                .setLngLat([centerLng, centerLat])
                                .addTo(map)

                            return { map, marker }
                        },
                        catch: (error) =>
                            mapMountFailure(
                                "Mapbox host could not initialize",
                                error
                            ),
                    })

                    setEventMap(hostId, map, marker)

                    return {
                        message: SucceededMountEventMap({ hostId }),
                        cleanup: (): void => removeEventMap(hostId),
                    }
                }),
                ({ cleanup }) => Effect.sync(cleanup)
            ).pipe(
                Effect.catch((error) =>
                    Effect.sync(() => {
                        console.error("[event-map] mount failed", error.cause)
                        return {
                            message: FailedMountEventMap({
                                reason: error.message,
                            }),
                            cleanup: (): void => undefined,
                        }
                    })
                ),
                Effect.map(({ message }) => message)
            )
        },
    })()
