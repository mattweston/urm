import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import { renderEventIndex, renderEventPage } from "../src/index.ts"

const event = {
    path: "/events/event-1/",
    title: "Open <studio>",
    description: "First paragraph.\n\nSecond paragraph.",
    date: Date.UTC(2026, 8, 12),
    start_time: "18:00",
    end_time: "20:00",
    venue_name: "Main & hall",
    latitude: "51.5",
    longitude: "-0.1",
    venue_url: "https://example.com/venue",
    tickets_url: "https://example.com/tickets",
}

describe("event renderer", () => {
    it("renders a semantic event index without hydration", async () => {
        const rendered = await Effect.runPromise(renderEventIndex([event]))

        expect(rendered.title).toBe("Events")
        expect(rendered.html).toContain("<main")
        expect(rendered.html).toContain("<article")
        expect(rendered.html).toContain('<time datetime="2026-09-12">')
        expect(rendered.html).toContain('href="/events/event-1/"')
        expect(rendered.html).not.toContain("<script")
        expect(rendered.html).not.toContain("data-foldkit")
    })

    it("renders structured event details and escapes text", async () => {
        const rendered = await Effect.runPromise(renderEventPage(event))

        expect(rendered.title).toBe("Open <studio>")
        expect(rendered.html).toContain("Open &lt;studio&gt;")
        expect(rendered.html).toContain("Main &amp; hall")
        expect(rendered.html).toContain("First paragraph.")
        expect(rendered.html).toContain("Second paragraph.")
        expect(rendered.html).toContain('href="https://example.com/tickets"')
        expect(rendered.html).toContain("site-event-panel")
        expect(rendered.html).toContain("site-event-detail")
        expect(rendered.html).toContain("site-event-temperature")
        expect(rendered.html).toContain("Buy tickets")
        expect(rendered.html).toContain("Back to events")
        expect(rendered.html).toContain('data-event-latitude="51.5"')
        expect(rendered.html).toContain('data-event-longitude="-0.1"')
        expect(rendered.html).not.toContain("Load interactive map")
        expect(rendered.html).toContain("Check current weather")
        expect(rendered.html).not.toContain("View location on map")
        expect(rendered.html).not.toContain("openstreetmap.org")
    })
})
