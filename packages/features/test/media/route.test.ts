import { describe, expect, it } from "vitest"

import {
    galleryHref,
    libraryHref,
    urlToAppRoute,
    videoDetailHref,
    videoHref,
} from "../../src/media/platform/route.ts"
import { LoadedMedia } from "../../src/media/platform/app.message.ts"
import { init, update } from "../../src/media/platform/app.update.ts"

describe("media routes", () => {
    it("parses the media index routes", () => {
        expect(urlToAppRoute(libraryHref())._tag).toBe("Library")
        expect(urlToAppRoute(galleryHref())._tag).toBe("Gallery")
        expect(urlToAppRoute(videoHref())).toEqual({
            _tag: "Video",
            slug: "",
        })
    })

    it("parses a video detail route", () => {
        expect(urlToAppRoute(videoDetailHref("fairy-bubbles"))).toEqual({
            _tag: "Video",
            slug: "fairy-bubbles",
        })
    })

    it("accepts persisted video slugs", () => {
        expect(urlToAppRoute("/media/video/unknown/")).toEqual({
            _tag: "Video",
            slug: "unknown",
        })
    })

    it("initializes the YouTube player from loaded video data", () => {
        const [initial] = init("/media/video/fairy-bubbles/")
        const [model] = update(
            initial,
            LoadedMedia({
                images: [],
                tags: [],
                entityTags: [],
                videos: [
                    {
                        id: "video-1",
                        slug: "fairy-bubbles",
                        title: "Fairy Bubbles",
                        embed_url: "https://www.youtube.com/embed/s5JauRrz988",
                        thumbnail_src:
                            "https://i.ytimg.com/vi/s5JauRrz988/hqdefault.jpg",
                        youtube_id: "s5JauRrz988",
                        order_position: 0,
                        updated_at: 1,
                    },
                ],
            })
        )

        expect(model.youtubePlayer.videoId).toBe("s5JauRrz988")
        expect(model.youtubePlayer.title).toBe("Fairy Bubbles")
        expect(model.youtubePlayer.isDebugEnabled).toBe(false)
        expect(model.youtubePlayer.seo.thumbnailUrl).toBe(
            "https://i.ytimg.com/vi/s5JauRrz988/hqdefault.jpg"
        )
    })
})
