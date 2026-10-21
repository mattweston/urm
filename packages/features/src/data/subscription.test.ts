import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { subscriptions } from "./subscription.ts"
import { init } from "./update.ts"

describe("Data spreadsheet viewport subscriptions", () => {
    it.each(["/data", "/data/", "/data/spreadsheets", "/data/spreadsheets/"])(
        "enables row measurement and scrolling on %s",
        (pathname) => {
            const [model] = init(pathname, "")
            const entries = Object.values(subscriptions)
            expect(entries).toHaveLength(2)
            for (const entry of entries) {
                expect(
                    Option.isSome(
                        entry.modelToDependencies(model).maybeDependencies
                    )
                ).toBe(true)
            }
        }
    )

    it("disables grid observers on the CSV page", () => {
        const [model] = init("/data/csv", "")
        for (const entry of Object.values(subscriptions)) {
            expect(
                Option.isNone(
                    entry.modelToDependencies(model).maybeDependencies
                )
            ).toBe(true)
        }
    })
})
