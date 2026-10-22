import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"

export const Gallery3dEditIndexRoute = taggedStruct("Gallery3dEdit")
export const Gallery3dEditItemRoute = taggedStruct("Gallery3dEditItem", {
    frameKey: S.String,
})
export const Gallery3dEditItemDetailsRoute = taggedStruct(
    "Gallery3dEditItemDetails",
    {
        frameKey: S.String,
    }
)
export const Gallery3dEditArtworkListRoute = taggedStruct(
    "Gallery3dEditArtworkList"
)
export const Gallery3dEditArtworkDetailsRoute = taggedStruct(
    "Gallery3dEditArtworkDetails",
    { frameKey: S.String }
)

export const Gallery3dEditRoute = S.Union([
    Gallery3dEditIndexRoute,
    Gallery3dEditItemRoute,
    Gallery3dEditItemDetailsRoute,
    Gallery3dEditArtworkListRoute,
    Gallery3dEditArtworkDetailsRoute,
])
export type Gallery3dEditRoute = typeof Gallery3dEditRoute.Type

const BASE = "/"

export type Gallery3dEditHrefs = Readonly<{
    index: () => string
    item: (frame_key: string) => string
    details: (frame_key: string) => string
    artwork_list: () => string
    artwork_details: (frame_key: string) => string
}>

export const gallery3dEditHrefs: Gallery3dEditHrefs = {
    index: () => `${BASE}/3d-gallery-edit/`,
    item: (frame_key) => `${BASE}/3d-gallery-edit/${frame_key}/`,
    details: (frame_key) => `${BASE}/3d-gallery-edit/${frame_key}/details/`,
    artwork_list: () => `${BASE}/3d-gallery-edit/artworks/`,
    artwork_details: (frame_key) =>
        `${BASE}/3d-gallery-edit/artworks/${frame_key}/`,
}

export const gallery3dEditHref = gallery3dEditHrefs.index
export const gallery3dEditItemHref = gallery3dEditHrefs.item
export const gallery3dEditItemDetailsHref = gallery3dEditHrefs.details
export const gallery3dEditArtworkListHref = gallery3dEditHrefs.artwork_list
export const gallery3dEditArtworkDetailsHref =
    gallery3dEditHrefs.artwork_details

export const isGallery3dEditPath = (pathname: string): boolean =>
    pathname === `${BASE}/3d-gallery-edit` ||
    pathname === `${BASE}/3d-gallery-edit/` ||
    pathname.startsWith(`${BASE}/3d-gallery-edit/`)

export const urlToGallery3dEditRoute = (url: Url): Gallery3dEditRoute => {
    const pathname = url.pathname.endsWith("/")
        ? url.pathname.slice(0, -1)
        : url.pathname
    const segments = pathname.split("/").filter(Boolean)

    const artworkListIndex = segments.lastIndexOf("artworks")
    if (artworkListIndex !== -1) {
        const frameKey = segments[artworkListIndex + 1]
        return frameKey === undefined
            ? Gallery3dEditArtworkListRoute()
            : Gallery3dEditArtworkDetailsRoute({ frameKey })
    }

    const lastTwo = segments.slice(-2)
    const detailsFrameKey = lastTwo[0]
    if (detailsFrameKey !== undefined && lastTwo[1] === "details") {
        return Gallery3dEditItemDetailsRoute({ frameKey: detailsFrameKey })
    }

    const lastSegment = segments.pop()
    if (lastSegment === "3d-gallery-edit" || lastSegment === undefined) {
        return Gallery3dEditIndexRoute()
    }

    return Gallery3dEditItemRoute({ frameKey: lastSegment })
}
