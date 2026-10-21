import type { Model } from "./youtube-embed.model.ts"
import { embedUrl, thumbnailUrl, watchUrl } from "./youtube-embed.urls.ts"

// Google wants a large thumbnail and will take a list, picking whichever it can
// fetch. `maxresdefault` does not exist for every video, so the smaller
// renditions follow it as fallbacks rather than replacing it.
const derivedThumbnails = (videoId: string): ReadonlyArray<string> => [
    thumbnailUrl(videoId, "maxresdefault"),
    thumbnailUrl(videoId, "sddefault"),
    thumbnailUrl(videoId, "hqdefault"),
]

// A `</script>` sequence inside the payload would close the tag early once this
// markup is server-rendered. `<` is a legal JSON string escape, so the
// document still parses as the same value.
const escapeForScriptTag = (json: string): string =>
    json.replaceAll("<", "\\u003c")

/**
 * JSON-LD following schema.org's `VideoObject`, which is what Google reads to
 * build video rich results.
 *
 * @see https://schema.org/VideoObject
 * @see https://developers.google.com/search/docs/appearance/structured-data/video
 */
export const videoStructuredData = (model: Model): string => {
    const seo = model.seo

    return escapeForScriptTag(
        JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: seo.name ?? model.title,
            thumbnailUrl:
                seo.thumbnailUrl === undefined
                    ? derivedThumbnails(model.videoId)
                    : [seo.thumbnailUrl],
            embedUrl: seo.embedUrl ?? embedUrl(model.videoId),
            contentUrl: seo.contentUrl ?? watchUrl(model.videoId),
            ...(seo.description === undefined
                ? {}
                : { description: seo.description }),
            ...(seo.uploadDate === undefined
                ? {}
                : { uploadDate: seo.uploadDate }),
            ...(seo.duration === undefined ? {} : { duration: seo.duration }),
        })
    )
}
