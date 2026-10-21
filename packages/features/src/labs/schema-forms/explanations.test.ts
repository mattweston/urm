import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { explanations } from "./explanations.ts"

describe("Schema line explanations", () => {
    it("keeps Task annotations aligned with the actual highlighted source", () => {
        const lines = readFileSync(
            new URL("./task-schema.ts", import.meta.url),
            "utf8"
        ).split("\n")
        for (const explanation of explanations("task")) {
            expect(lines[explanation.line - 1]).toContain(explanation.anchor)
        }
    })
    it("keeps Issue annotations aligned with the actual highlighted source", () => {
        const lines = readFileSync(
            new URL("./issue-schema.ts", import.meta.url),
            "utf8"
        ).split("\n")
        for (const explanation of explanations("issue")) {
            expect(lines[explanation.line - 1]).toContain(explanation.anchor)
        }
    })
})
