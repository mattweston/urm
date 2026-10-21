import { describe, expect, it } from "vitest"
import { init, type VideoSeo } from "./youtube-embed.model.ts"
import { videoStructuredData } from "./youtube-embed.seo.ts"

const structuredData = (seo?: VideoSeo): Record<string, unknown> => {
    const model = init(
        { id: "video-id", title: "Video title" },
        seo === undefined ? undefined : { seo }
    )

    return JSON.parse(videoStructuredData(model))
}

describe("YouTube embed structured data", () => {
    it("derives every required field from the video id and title", () => {
        expect(structuredData()).toEqual({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: "Video title",
            thumbnailUrl: [
                "https://i.ytimg.com/vi/video-id/maxresdefault.jpg",
                "https://i.ytimg.com/vi/video-id/sddefault.jpg",
                "https://i.ytimg.com/vi/video-id/hqdefault.jpg",
            ],
            embedUrl: "https://www.youtube-nocookie.com/embed/video-id",
            contentUrl: "https://www.youtube.com/watch?v=video-id",
        })
    })

    it("offers large thumbnails first so Google takes the best it can fetch", () => {
        const thumbnails = structuredData().thumbnailUrl

        expect(thumbnails).toEqual([
            expect.stringContaining("maxresdefault"),
            expect.stringContaining("sddefault"),
            expect.stringContaining("hqdefault"),
        ])
    })

    it("omits optional fields rather than emitting empty ones", () => {
        const data = structuredData()

        expect(data).not.toHaveProperty("description")
        expect(data).not.toHaveProperty("uploadDate")
        expect(data).not.toHaveProperty("duration")
    })

    it("lets a caller override the derived fields", () => {
        expect(
            structuredData({
                name: "Override title",
                thumbnailUrl: "https://example.test/poster.png",
                embedUrl: "https://example.test/embed",
                contentUrl: "https://example.test/watch",
                description: "A description",
                uploadDate: "2026-01-02",
                duration: "PT1M30S",
            })
        ).toEqual({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: "Override title",
            thumbnailUrl: ["https://example.test/poster.png"],
            embedUrl: "https://example.test/embed",
            contentUrl: "https://example.test/watch",
            description: "A description",
            uploadDate: "2026-01-02",
            duration: "PT1M30S",
        })
    })

    it("percent-encodes a video id into every derived URL", () => {
        const model = init({ id: "a/b?c&d", title: "Video title" })
        const data: Record<string, unknown> = JSON.parse(
            videoStructuredData(model)
        )

        expect(data.contentUrl).toBe(
            "https://www.youtube.com/watch?v=a%2Fb%3Fc%26d"
        )
        expect(data.embedUrl).toBe(
            "https://www.youtube-nocookie.com/embed/a%2Fb%3Fc%26d"
        )
    })

    it("escapes a title that would close the script tag early", () => {
        const model = init({
            id: "video-id",
            title: "</script><img onerror=alert(1)>",
        })
        const json = videoStructuredData(model)

        expect(json).not.toContain("</script>")
        expect(json).toContain("\\u003c/script")

        const data: Record<string, unknown> = JSON.parse(json)
        expect(data.name).toBe("</script><img onerror=alert(1)>")
    })
})
