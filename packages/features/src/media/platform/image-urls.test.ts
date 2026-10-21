import { describe, expect, test } from "vitest"
import { ResolvedImageUrls } from "./app.message.ts"
import { init, update } from "./app.update.ts"

describe("Media image URL resolution", () => {
    test("retains the stored URL across preview signature refreshes", () => {
        const stored_url =
            "https://fly.storage.tigris.dev/urm-dev/domains/example/gallery/image"
        const [initial] = init("/media")
        const model = {
            ...initial,
            images: [
                {
                    id: "image",
                    url: stored_url,
                    alt: "Image",
                    text: "",
                    order_position: 0,
                    updated_at: 1,
                },
            ],
        }
        const [resolved] = update(
            model,
            ResolvedImageUrls({
                images: [
                    { stored_url, url: `${stored_url}?X-Amz-Signature=first` },
                ],
            })
        )
        const [refreshed] = update(
            resolved,
            ResolvedImageUrls({
                images: [
                    { stored_url, url: `${stored_url}?X-Amz-Signature=second` },
                ],
            })
        )
        expect(refreshed.images[0]?.stored_url).toBe(stored_url)
        expect(refreshed.images[0]?.url).toBe(
            `${stored_url}?X-Amz-Signature=second`
        )
    })
})
