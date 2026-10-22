import { Effect } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { play, setEnabled, setVolume, sounds } from "cuelume"
import {
    DashboardRoute,
    LabsRoute,
    sidebarRouteTag,
} from "../../../routing/route.ts"
import { changed_route, cuelume_href, init, update } from "./submodel.ts"

vi.mock("cuelume", async (import_original) => {
    const original = await import_original<typeof import("cuelume")>()
    return {
        ...original,
        play: vi.fn(),
        setEnabled: vi.fn(),
        setVolume: vi.fn(),
        bind: vi.fn(),
    }
})
const route = LabsRoute({ labs_path: "/labs/media/audio/cuelume" })

beforeEach(() => vi.clearAllMocks())

describe("client Cuelume lab", () => {
    it("opens with its nested audio navigation", () => {
        expect(init(route).active).toBe(true)
        expect(cuelume_href()).toBe("/labs/media/audio/cuelume")
        expect(sidebarRouteTag(route)).toBe("LabsCuelume")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsCuelume")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: "/labs/media/audio" }))
        ).toBe("LabsAudio")
        expect(play).not.toHaveBeenCalled()
    })
    it("defers mute and volume changes to commands", () => {
        const [muted, mute_commands] = update(init(route), {
            _tag: "ClickedMute",
        })
        expect(muted.enabled).toBe(false)
        expect(setEnabled).not.toHaveBeenCalled()
        for (const command of mute_commands) Effect.runSync(command.effect)
        expect(setEnabled).toHaveBeenCalledWith(false)
        const [louder, volume_commands] = update(muted, {
            _tag: "ChangedVolume",
            value: "75",
        })
        expect(louder.volume).toBe(0.75)
        for (const command of volume_commands) Effect.runSync(command.effect)
        expect(setVolume).toHaveBeenLastCalledWith(0.75)
        expect(setEnabled).toHaveBeenLastCalledWith(false)
    })
    it("clamps volume and ignores invalid values", () => {
        const model = init(route)
        expect(
            update(model, { _tag: "ChangedVolume", value: "invalid" })
        ).toEqual([model, []])
        expect(
            update(model, { _tag: "ChangedVolume", value: "200" })[0].volume
        ).toBe(1)
        expect(
            update(model, { _tag: "ChangedVolume", value: "-20" })[0].volume
        ).toBe(0)
    })
    it("plays semantic outcome sounds only when commands run", () => {
        const [saved, commands] = update(init(route), { _tag: "ClickedSave" })
        expect(saved.last_sound).toBe("success")
        expect(play).not.toHaveBeenCalled()
        for (const command of commands) Effect.runSync(command.effect)
        expect(play).toHaveBeenCalledWith("success")
        const [expanded, reveal_commands] = update(saved, {
            _tag: "ClickedReveal",
        })
        for (const command of reveal_commands) Effect.runSync(command.effect)
        expect(expanded.is_expanded).toBe(true)
        expect(play).toHaveBeenLastCalledWith("open")
        const [collapsed, collapse_commands] = update(expanded, {
            _tag: "ClickedReveal",
        })
        for (const command of collapse_commands) Effect.runSync(command.effect)
        expect(collapsed.is_expanded).toBe(false)
        expect(play).toHaveBeenLastCalledWith("close")
    })
    it("does not double-play declarative sound previews", () => {
        for (const sound of sounds) {
            const [selected, commands] = update(init(route), {
                _tag: "ClickedSound",
                sound,
            })
            expect(selected.last_sound).toBe(sound)
            expect(commands).toEqual([])
        }
        expect(play).not.toHaveBeenCalled()
    })
    it("keeps preferences on reentry and ignores inactive actions", () => {
        const [muted] = update(init(route), { _tag: "ClickedMute" })
        const [quiet] = update(muted, { _tag: "ChangedVolume", value: "20" })
        const inactive = changed_route(quiet, DashboardRoute())
        expect(inactive.active).toBe(false)
        expect(update(inactive, { _tag: "ClickedSave" })).toEqual([
            inactive,
            [],
        ])
        const reopened = changed_route(inactive, route)
        expect(reopened.enabled).toBe(false)
        expect(reopened.volume).toBe(0.2)
        expect(play).not.toHaveBeenCalled()
    })
})
