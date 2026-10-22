import { describe, expect, it } from "vitest"
import { ChangedDemoRoute } from "./ported-demos.message.ts"
import { demoHref, demoRouteForPath } from "./ported-demos.route.ts"
import { init, update } from "./ported-demos.update.ts"

describe("ported demos", () => {
    it("maps every demo to a stable lab route", () => {
        expect(demoRouteForPath(demoHref("Cartlane"))).toBe("Cartlane")
        expect(demoRouteForPath(demoHref("Draftboard"))).toBe("Draftboard")
        expect(demoRouteForPath(demoHref("Relay"))).toBe("Relay")
        expect(demoRouteForPath(demoHref("Streambox"))).toBe("Streambox")
        expect(demoRouteForPath(demoHref("Threadline"))).toBe("Threadline")
    })
    it("forwards Cartlane startup commands", () => {
        const [model, commands] = init()
        expect(model.cartlane.storage_state).toBe("Loading")
        expect(commands).toHaveLength(1)
    })
    it("routes nested parity states", () => {
        const [model] = init()
        const [draftboard] = update(
            model,
            ChangedDemoRoute({
                route: "Draftboard",
                path: "/draftboard/empty/",
            })
        )
        const [streambox] = update(
            draftboard,
            ChangedDemoRoute({
                route: "Streambox",
                path: "/streambox/quiet-current/transcript/",
            })
        )
        expect(draftboard.draftboard.document.id).toBe("empty")
        expect(streambox.streambox.video_id).toBe("quiet-current")
        expect(streambox.streambox.panel).toBe("Transcript")
    })
})
