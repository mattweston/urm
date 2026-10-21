import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { init, type Model } from "./youtube-embed.model.ts"
import type { Message } from "./youtube-embed.message.ts"
import { view, type ViewOptions } from "./youtube-embed.view.ts"

const render = async (options: ViewOptions = {}, thumbnail_url?: string) => {
    const model = init(
        { id: "a/b", title: "Example video" },
        {
            seo:
                thumbnail_url === undefined
                    ? {}
                    : { thumbnailUrl: thumbnail_url },
        }
    )
    const rendered = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model, commands: [] }),
                view: (model: Model, h: HtmlBuilder<Message>) => ({
                    title: "YouTube embed",
                    body: view(model, (message) => message, h, options),
                }),
            },
            { buildId: "youtube-embed-test" }
        )
    )
    return rendered.html
}

describe("YouTube embed presentation", () => {
    it("server-renders the complete embed with a regular watch link", async () => {
        const html = await render()
        expect(html).not.toContain("<noscript")
        expect(html).toMatch(
            /<a[^>]*href="https:\/\/www.youtube.com\/watch\?v=a%2Fb"/
        )
        expect(html).toContain('aria-label="Watch Example video on YouTube"')
    })

    it("preloads the default WebP poster without loading the player", async () => {
        const html = await render()
        expect(html).toContain(
            'src="https://i.ytimg.com/vi_webp/a%2Fb/hqdefault.webp"'
        )
        expect(html).toMatch(
            /<link(?=[^>]*as="image")[^>]*rel="preload"[^>]*href="https:\/\/i.ytimg.com\/vi_webp\/a%2Fb\/hqdefault.webp"/
        )
        expect(html).not.toContain("<iframe")
        expect(html).toContain("aspect-ratio: 16 / 9")
        expect(html).toContain('viewBox="0 0 68 48"')
    })

    it("supports portrait layouts and JPEG poster quality selection", async () => {
        const html = await render({
            aspect_width: 9,
            aspect_height: 16,
            poster_quality: "maxresdefault",
            webp: false,
        })
        expect(html).toContain(
            'src="https://i.ytimg.com/vi/a%2Fb/maxresdefault.jpg"'
        )
        expect(html).toContain("aspect-ratio: 9 / 16")
    })

    it("preloads custom thumbnails and falls back from invalid dimensions", async () => {
        const html = await render(
            { aspect_width: 0, aspect_height: Number.NaN },
            "https://example.test/poster.jpg"
        )
        expect(html).toMatch(
            /<link(?=[^>]*as="image")[^>]*rel="preload"[^>]*href="https:\/\/example.test\/poster.jpg"/
        )
        expect(html).toContain("aspect-ratio: 16 / 9")
    })
})
