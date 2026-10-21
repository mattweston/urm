import { describe, expect, test } from "vitest"
import { subscriptions } from "./main.ts"

describe("application subscription composition", () => {
    test("registers sidebar drag subscriptions alongside existing feature subscriptions", () => {
        expect(Object.keys(subscriptions)).toEqual(
            expect.arrayContaining([
                "sidebarSettingsPointer",
                "sidebarSettingsEscape",
                "sidebarSettingsKeyboard",
                "sidebarSettingsAutoScroll",
                "issueDragAutoScroll",
            ])
        )
    })
})
