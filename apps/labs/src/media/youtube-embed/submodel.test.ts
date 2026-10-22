import { describe, expect, it } from "vitest"
import {
    DashboardRoute,
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, embed_href, init, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/labs/media/youtube-embed" })

describe("client YouTube embed lab", () => {
    it("opens the media lab with client navigation", () => {
        expect(init(route).active).toBe(true)
        expect(embed_href()).toBe("/labs/media/youtube-embed")
        expect(sidebarRouteTag(route)).toBe("LabsYouTube")
    })

    it("resets playback on exit and ignores late player messages", () => {
        const [playing] = update(init(route), { _tag: "ClickedPreview" })
        expect(playing.player.isPreviewing).toBe(false)
        const inactive = changed_route(playing, DashboardRoute())
        expect(inactive.active).toBe(false)
        expect(inactive.player.isPreviewing).toBe(true)
        expect(update(inactive, { _tag: "ClickedPreview" })).toEqual([
            inactive,
            [],
        ])
        const reopened = changed_route(inactive, route)
        expect(reopened.active).toBe(true)
        expect(reopened.player.isPreviewing).toBe(true)
    })
})
