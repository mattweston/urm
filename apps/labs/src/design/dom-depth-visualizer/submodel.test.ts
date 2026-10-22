import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, dom_depth_href, init, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/design/dom-depth-visualizer" })

describe("client DOM depth visualizer lab", () => {
    it("loads its preference only when opened under Design", () => {
        const [opened, commands] = init(route)
        expect(opened.active).toBe(true)
        expect(commands).toHaveLength(1)
        expect(init(LabsRoute({ labs_path: "/" }))[1]).toEqual([])
        expect(dom_depth_href()).toBe("/design/dom-depth-visualizer")
        expect(sidebarRouteTag(route)).toBe("LabsDomDepth")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsDomDepth")
        expect(sidebarRouteTag(LabsRoute({ labs_path: "/design" }))).toBe(
            "LabsDesign"
        )
    })

    it("saves toggles and reloads the preference on reentry", () => {
        const [enabled, save_commands] = update(init(route)[0], {
            _tag: "ClickedToggle",
        })
        expect(enabled.visualizer.isActive).toBe(true)
        expect(save_commands).toHaveLength(1)
        const [inactive, exit_commands] = changed_route(
            enabled,
            LabsRoute({ labs_path: "/" })
        )
        expect(inactive.active).toBe(false)
        expect(inactive.visualizer.isActive).toBe(false)
        expect(exit_commands).toEqual([])
        expect(
            update(inactive, { _tag: "LoadedPreference", isActive: true })
        ).toEqual([inactive, []])
        const [reopened, load_commands] = changed_route(inactive, route)
        expect(load_commands).toHaveLength(1)
        const [restored] = update(reopened, {
            _tag: "LoadedPreference",
            isActive: true,
        })
        expect(restored.visualizer.isActive).toBe(true)
    })
})
