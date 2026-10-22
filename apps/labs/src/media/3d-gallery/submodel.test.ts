import { Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    DashboardRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { init, update, changed_route, gallery_path } from "./submodel.ts"

const route = (suffix = "") =>
    LabsRoute({ labs_path: `${gallery_path}${suffix}` })

describe("client 3D gallery lab", () => {
    it("opens 3D artwork and list detail deep links under Labs / Media", () => {
        const [model] = init(route("/bridge/details"))
        expect(model.gallery.route._tag).toBe("Gallery3dEditItemDetails")
        expect(Option.getOrUndefined(model.gallery.selectedFrameKey)).toBe(
            "bridge"
        )
        expect(sidebarRouteTag(route("/bridge/details"))).toBe("LabsGallery")

        const [list] = init(route("/artworks"))
        expect(list.gallery.route._tag).toBe("Gallery3dEditArtworkList")
        expect(list.gallery.grid_view).toBe(true)

        const [list_detail] = init(route("/artworks/bridge"))
        expect(list_detail.gallery.route._tag).toBe(
            "Gallery3dEditArtworkDetails"
        )
        expect(list_detail.gallery.grid_view).toBe(true)
    })

    it("uses path URLs and preserves edits through browser history", () => {
        const [initial] = init(route())
        const [artwork_list, list_commands] = update(initial, {
            _tag: "ToggledGridView",
        })
        expect(
            list_commands.find((command) => command.name === "NavigateGallery")
                ?.args
        ).toEqual({ href: "/labs/media/3d-gallery/artworks" })
        const [list_details, list_detail_commands] = update(artwork_list, {
            _tag: "ClickedArtworkListItem",
            frameKey: "bridge",
        })
        expect(list_details.gallery.route._tag).toBe(
            "Gallery3dEditArtworkDetails"
        )
        expect(
            list_detail_commands.find(
                (command) => command.name === "NavigateGallery"
            )?.args
        ).toEqual({ href: "/labs/media/3d-gallery/artworks/bridge" })
        const [edited] = update(initial, {
            _tag: "ChangedGalleryText",
            frameKey: "bridge",
            field: "title",
            value: "Edited",
        })
        const [selected, commands] = update(edited, {
            _tag: "ClickedFrame",
            frameKey: "bridge",
        })
        expect(
            commands.find((command) => command.name === "NavigateGallery")?.args
        ).toEqual({ href: "/labs/media/3d-gallery/bridge" })
        const [details] = changed_route(selected, route("/bridge/details"))
        const [back] = changed_route(details, route())
        expect(back.gallery.textOverrides.bridge?.title).toBe("Edited")
        expect(back.gallery.selectedFrameKey._tag).toBe("None")
    })

    it("resets on exit and ignores late messages while inactive", () => {
        const [initial] = init(route())
        const [exited] = changed_route(initial, DashboardRoute())
        const late = {
            _tag: "ClickedFrame",
            frameKey: "bridge",
        } satisfies import("./submodel.ts").Message
        expect(update(exited, late)).toEqual([exited, []])
        expect(changed_route(initial, route())).toEqual([initial, []])
    })
})
