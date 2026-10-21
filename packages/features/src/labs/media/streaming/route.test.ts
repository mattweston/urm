import { describe, expect, it } from "vitest"

import { isStreamingPath, streamingHref } from "./route.ts"

describe("streaming route", () => {
    it("builds and recognizes the canonical route", () => {
        expect(streamingHref()).toBe("/labs/media/streaming/")
        expect(isStreamingPath("/labs/media/streaming")).toBe(true)
        expect(isStreamingPath(streamingHref())).toBe(true)
        expect(isStreamingPath("/labs/media/streaming/example")).toBe(false)
    })
})
