import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

// The demo's own route, mirrored out of the application route so the
// Transition helpers have a union of their own to work over.
export const RtHome = taggedStruct("RtHome")
export const RtGallery = taggedStruct("RtGallery")
export const RtPainting = taggedStruct("RtPainting", { paintingId: S.Number })
export const RtStudio = taggedStruct("RtStudio")

export const RtRoute = S.Union([RtHome, RtGallery, RtPainting, RtStudio])
export type RtRoute = typeof RtRoute.Type

export const CatalogStatus = S.Literals(["Idle", "Loading", "Ready"])
export type CatalogStatus = typeof CatalogStatus.Type

export const PaintingIdle = taggedStruct("PaintingIdle")
export const PaintingLoading = taggedStruct("PaintingLoading", {
    paintingId: S.Number,
})
export const PaintingReady = taggedStruct("PaintingReady", {
    paintingId: S.Number,
})

export const PaintingStatus = S.Union([
    PaintingIdle,
    PaintingLoading,
    PaintingReady,
])
export type PaintingStatus = typeof PaintingStatus.Type

export const LoggedTransition = S.Struct({
    sequenceNumber: S.Number,
    maybePreviousRoute: S.Option(RtRoute),
    nextRoute: RtRoute,
})
export type LoggedTransition = typeof LoggedTransition.Type

export const MAX_LOGGED_TRANSITIONS = 20

const PATH = "/labs/learn/route-transitions"

export const routeTransitionsHref = (): string => `${PATH}/`
export const routeTransitionsGalleryHref = (): string => `${PATH}/gallery/`
export const routeTransitionsPaintingHref = (paintingId: number): string =>
    `${PATH}/gallery/${paintingId}/`
export const routeTransitionsStudioHref = (): string => `${PATH}/studio/`

export const isRouteTransitionsPath = (pathname: string): boolean =>
    pathname === PATH || pathname.startsWith(`${PATH}/`)

export const rtRouteForPath = (pathname: string): RtRoute => {
    if (pathname === `${PATH}/gallery` || pathname === `${PATH}/gallery/`) {
        return RtGallery()
    }

    const paintingMatch = pathname.match(
        new RegExp(`^${PATH}/gallery/(\\d+)/?$`)
    )
    const paintingId = Number(paintingMatch?.[1])
    if (Number.isFinite(paintingId) && paintingId > 0) {
        return RtPainting({ paintingId })
    }

    if (pathname === `${PATH}/studio` || pathname === `${PATH}/studio/`) {
        return RtStudio()
    }

    return RtHome()
}
