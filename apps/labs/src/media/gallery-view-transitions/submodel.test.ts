import { describe, expect, it } from "vitest"
import {
    DashboardRoute,
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, gallery_href, init, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/labs/media/gallery-view-transitions" })

describe("client gallery view transitions lab", () => {
    it("opens through client navigation and highlights its sidebar entry", () => {
        expect(init(route).active).toBe(true)
        expect(gallery_href()).toBe("/labs/media/gallery-view-transitions")
        expect(sidebarRouteTag(route)).toBe("LabsGalleryTransitions")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsGalleryTransitions")
    })

    it("resets image details on exit and ignores late gallery messages", () => {
        const selected = { _tag: "SelectedGalleryImage", id: "bridge" }
        const [opened] = update(init(route), {
            _tag: "SelectedGalleryImage",
            id: selected.id,
        })
        expect(opened.gallery.selected_image_id).toBe(selected.id)
        const inactive = changed_route(opened, DashboardRoute())
        expect(inactive.active).toBe(false)
        expect(inactive.gallery.selected_image_id).toBeNull()
        expect(
            update(inactive, { _tag: "SelectedGalleryImage", id: selected.id })
        ).toEqual([inactive, []])
        expect(
            changed_route(inactive, route).gallery.selected_image_id
        ).toBeNull()
    })
})
