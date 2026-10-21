import { Option } from "effect"
import { describe, expect, it } from "vitest"

import {
    DashboardRoute,
    DesignRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, is_logo_path, logo_href } from "./submodel.ts"

describe("client logo designer", () => {
    const route = DesignRoute({ design_path: logo_href() })

    it("opens beneath Design with its sidebar entry", () => {
        expect(init(route).active).toBe(true)
        expect(init(route).designer.elements).not.toHaveLength(0)
        expect(is_logo_path(`${logo_href()}/`)).toBe(true)
        expect(sidebarRouteTag(route)).toBe("DesignLogo")
    })

    it("preserves the local document while the route changes", () => {
        const initial = init(route)
        const inactive = changed_route(initial, DashboardRoute())

        expect(inactive.active).toBe(false)
        expect(inactive.designer).toEqual(initial.designer)
        expect(inactive.logo_id).toEqual(Option.none())
        expect(changed_route(inactive, route).active).toBe(true)
    })
})
