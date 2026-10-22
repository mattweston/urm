import { describe, expect, it } from "vitest"

import { isStreamingPath, streamingHref } from "./route.ts"

describe("streaming route", () => {
    it("builds and recognizes the canonical route", () => {
        expect(streamingHref()).toBe("/media/streaming/")
        expect(isStreamingPath("/media/streaming")).toBe(true)
        expect(isStreamingPath(streamingHref())).toBe(true)
        expect(isStreamingPath("/media/streaming/example")).toBe(false)
    })
})
