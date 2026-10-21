import { describe, expect, it } from "vitest"
import {
    getThemeFromCookieHeader,
    themeCriticalColors,
} from "../../src/settings/theme/theme.runtime.ts"

describe("theme runtime", () => {
    it("reads the Brutalism preset from a persisted preference cookie", () => {
        expect(getThemeFromCookieHeader("theme=brutalism")).toBe("brutalism")
    })

    it("uses the Brutalism light critical colors for SSR", () => {
        expect(themeCriticalColors.brutalism).toEqual({
            background: "oklch(0.955 0.012 96)",
            foreground: "oklch(0.115 0.012 255)",
            colorScheme: "light",
        })
    })
})
