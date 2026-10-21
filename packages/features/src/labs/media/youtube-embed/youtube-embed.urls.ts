export const YOUTUBE_NOCOOKIE_URL = "https://www.youtube-nocookie.com"

export type PosterQuality =
    | "default"
    | "mqdefault"
    | "hqdefault"
    | "sddefault"
    | "maxresdefault"

// What the page displays. WebP is the smaller download, and `hqdefault` is the
// largest rendition that exists for every video.
export const posterUrl = (
    videoId: string,
    quality: PosterQuality = "hqdefault",
    webp = true
): string =>
    `https://i.ytimg.com/${webp ? "vi_webp" : "vi"}/${encodeURIComponent(videoId)}/${quality}.${webp ? "webp" : "jpg"}`

// What structured data advertises. This costs the page nothing to name, so it
// can point at the large renditions, and it uses JPEG because that is the
// format every crawler fetches without negotiation.
export const thumbnailUrl = (videoId: string, quality: PosterQuality): string =>
    `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`

export const playerUrl = (videoId: string): string => {
    const url = new URL(
        `/embed/${encodeURIComponent(videoId)}`,
        YOUTUBE_NOCOOKIE_URL
    )
    url.searchParams.set("autoplay", "1")
    url.searchParams.set("enablejsapi", "1")
    return url.toString()
}

// The player runs on the no-cookie host, but the canonical page a crawler or a
// reader should be sent to is the ordinary watch URL.
export const watchUrl = (videoId: string): string =>
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`

export const embedUrl = (videoId: string): string =>
    `${YOUTUBE_NOCOOKIE_URL}/embed/${encodeURIComponent(videoId)}`
