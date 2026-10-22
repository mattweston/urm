import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, music_notation_href, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/media/music-notation" })

describe("client music notation lab", () => {
    it("opens through client navigation with its sidebar entry", () => {
        expect(init(route).active).toBe(true)
        expect(music_notation_href()).toBe("/media/music-notation")
        expect(sidebarRouteTag(route)).toBe("LabsMusicNotation")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsMusicNotation")
    })

    it("stops playback and resets notation on exit", () => {
        const [playing, play_commands] = update(init(route), {
            _tag: "ClickedPlay",
        })
        expect(playing.notation.isPlaying).toBe(true)
        expect(play_commands).toHaveLength(1)
        const [tablature] = update(playing, { _tag: "ToggledTablature" })
        const [inactive, stop_commands] = changed_route(
            tablature,
            LabsRoute({ labs_path: "/" })
        )
        expect(stop_commands).toHaveLength(1)
        expect(inactive.active).toBe(false)
        expect(inactive.notation.isPlaying).toBe(false)
        expect(inactive.notation.showTablature).toBe(false)
        expect(update(inactive, { _tag: "ClickedPlay" })).toEqual([
            inactive,
            [],
        ])
        expect(changed_route(inactive, route)).toEqual([init(route), []])
    })
})
