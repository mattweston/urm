import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { getHostOrigin } from "../../src/browser/index.ts"

describe("Browser Utils", () => {
    it("uses the browser location origin when available", () => {
        vi.stubGlobal("window", {
            location: { origin: "https://app.example.com" },
        })

        try {
            expect(getHostOrigin()).toBe("https://app.example.com")
        } finally {
            vi.unstubAllGlobals()
        }
    })

    it("uses the configured server port when rendering without a browser", () => {
        const originalPort = process.env.PORT
        vi.stubGlobal("window", undefined)
        process.env.PORT = "4322"

        try {
            expect(getHostOrigin()).toBe("http://localhost:4322")
        } finally {
            vi.unstubAllGlobals()
            if (originalPort === undefined) {
                delete process.env.PORT
            } else {
                process.env.PORT = originalPort
            }
        }
    })

    it("uses the default server port without a browser or PORT", () => {
        const originalPort = process.env.PORT
        vi.stubGlobal("window", undefined)
        delete process.env.PORT

        try {
            expect(getHostOrigin()).toBe("http://localhost:4321")
        } finally {
            vi.unstubAllGlobals()
            if (originalPort === undefined) {
                delete process.env.PORT
            } else {
                process.env.PORT = originalPort
            }
        }
    })
})
