import { describe, expect, it } from "vitest"
import {
    DashboardRoute,
    DevRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { bookmarks_href, changed_route, init, update } from "./submodel.ts"

const route = DevRoute({ dev_path: "/dev/bookmarks" })

describe("client dev bookmarks", () => {
    it("opens through client navigation under Dev", () => {
        expect(init(route).active).toBe(true)
        expect(bookmarks_href()).toBe("/dev/bookmarks")
        expect(sidebarRouteTag(route)).toBe("DevBookmarks")
        expect(
            sidebarRouteTag(DevRoute({ dev_path: `${route.dev_path}/` }))
        ).toBe("DevBookmarks")
    })

    it("resets search on exit and ignores inactive input", () => {
        const [searched] = update(init(route), {
            _tag: "UpdatedBookmarkSearchQuery",
            value: "typescript",
        })
        expect(searched.bookmarks.query).toBe("typescript")
        const inactive = changed_route(searched, DashboardRoute())
        expect(inactive.active).toBe(false)
        expect(inactive.bookmarks.query).toBe("")
        expect(
            update(inactive, {
                _tag: "UpdatedBookmarkSearchQuery",
                value: "astro",
            })
        ).toEqual([inactive, []])
        expect(changed_route(inactive, route)).toEqual(init(route))
    })
})
