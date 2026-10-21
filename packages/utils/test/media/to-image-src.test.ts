import { describe, expect, it } from "@effect/vitest"
import { requiresImageUrlProxy, toImageSrc } from "../../src/media/image-url.ts"

describe("image URL presentation", () => {
    it("preserves stored and resolved URLs without inventing a proxy endpoint", () => {
        for (const url of [
            "https://fly.storage.tigris.dev/bucket/domains/example/gallery/image",
            "https://fly.storage.tigris.dev/bucket/domains/example/gallery/image?X-Amz-Signature=preview",
            "https://images.example.com/logo.png",
        ])
            expect(toImageSrc(url)).toBe(url)
        expect(toImageSrc(null)).toBe("")
        expect(toImageSrc(undefined)).toBe("")
    })

    it("identifies storage URLs for host-owned resolution without substring spoofing", () => {
        expect(
            requiresImageUrlProxy("https://bucket.tigris.dev/gallery/image")
        ).toBe(true)
        expect(
            requiresImageUrlProxy("https://images.example.com/gallery/image")
        ).toBe(false)
        expect(
            requiresImageUrlProxy("https://images.example.com/?next=tigris.dev")
        ).toBe(false)
        expect(requiresImageUrlProxy("not a URL")).toBe(false)
    })
})
