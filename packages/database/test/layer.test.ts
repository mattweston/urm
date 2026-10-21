import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { DB } from "../src/layer.js"

describe("Database Layer", () => {
    it.effect("exports DB as an Effect service tag", () => {
        expect(typeof DB).toBe("function")
        expect(DB).toBeDefined()
        return Effect.void
    })
})
