import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, update, variable_fonts_href } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/typography/variable-fonts" })

describe("client variable fonts lab", () => {
    it("opens under Typography with client navigation", () => {
        expect(init(route).active).toBe(true)
        expect(variable_fonts_href()).toBe("/typography/variable-fonts")
        expect(sidebarRouteTag(route)).toBe("LabsVariableFonts")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsVariableFonts")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: "/typography" }))
        ).toBe("LabsTypography")
    })
    it("resets the specimen on exit and ignores inactive input", () => {
        const [edited] = update(init(route), {
            _tag: "UpdatedWeight",
            value: 650,
        })
        expect(edited.fonts.weight).toBe(650)
        const inactive = changed_route(edited, LabsRoute({ labs_path: "/" }))
        expect(inactive.active).toBe(false)
        expect(update(inactive, { _tag: "UpdatedWeight", value: 900 })).toEqual(
            [inactive, []]
        )
        expect(changed_route(inactive, route)).toEqual(init(route))
    })
})
