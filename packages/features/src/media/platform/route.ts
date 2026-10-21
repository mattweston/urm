import { Option, Schema } from "effect"
import { taggedStruct } from "foldkit/schema"
import { VideoSlug, type VideoSlug as VideoSlugType } from "../video/video.ts"

export const LibraryRoute = taggedStruct("Library")
export const GalleryRoute = taggedStruct("Gallery")
export const VideoRoute = taggedStruct("Video", { slug: VideoSlug })
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([
    LibraryRoute,
    GalleryRoute,
    VideoRoute,
    NotFoundRoute,
])

export type AppRoute = typeof AppRoute.Type

const ROOT_BASE = "/media"
const LEGACY_BASE = "/media/urm"

const appPathname = (pathname: string): string => {
    if (pathname.startsWith(LEGACY_BASE)) {
        return pathname.slice(LEGACY_BASE.length) || "/"
    }

    if (pathname.startsWith(ROOT_BASE)) {
        return pathname.slice(ROOT_BASE.length) || "/"
    }

    return pathname
}

export const urlToAppRoute = (pathname: string): AppRoute => {
    const nextPathname = appPathname(pathname)

    if (
        nextPathname === "/" ||
        nextPathname === "/library" ||
        nextPathname === "/library/"
    ) {
        return LibraryRoute()
    }

    if (nextPathname === "/gallery" || nextPathname === "/gallery/") {
        return GalleryRoute()
    }

    if (nextPathname === "/video" || nextPathname === "/video/") {
        return VideoRoute({ slug: "" })
    }

    if (nextPathname.startsWith("/video/")) {
        const slug = nextPathname.slice("/video/".length).replace(/\/$/, "")

        return Option.match(Schema.decodeUnknownOption(VideoSlug)(slug), {
            onNone: () => NotFoundRoute({ path: pathname }),
            onSome: (video_slug) => VideoRoute({ slug: video_slug }),
        })
    }

    return NotFoundRoute({ path: pathname })
}

export const libraryHref = () => `${ROOT_BASE}/library/`
export const galleryHref = () => `${ROOT_BASE}/gallery/`
export const videoHref = () => `${ROOT_BASE}/video/`
export const videoDetailHref = (slug: VideoSlugType) =>
    `${ROOT_BASE}/video/${slug}/`

export const isAppScope = (pathname: string) =>
    pathname === ROOT_BASE ||
    pathname.startsWith(`${ROOT_BASE}/`) ||
    pathname === LEGACY_BASE ||
    pathname.startsWith(`${LEGACY_BASE}/`)
