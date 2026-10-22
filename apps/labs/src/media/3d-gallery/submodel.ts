import { Option, Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import { Url } from "foldkit/url"
import * as Gallery from "@urm/features/labs/3d-gallery-edit"
import "@urm/features/labs/3d-gallery-edit/styles.css"
import type { DesktopRoute } from "../../routing/route.ts"

export const gallery_path = "/media/3d-gallery"
export const gallery_href = () => gallery_path
export const is_gallery_path = (path: string) =>
    path === gallery_path || path.startsWith(`${gallery_path}/`)

const hrefs: Gallery.Gallery3dEditHrefs = {
    index: gallery_href,
    item: (frame_key) => `${gallery_href()}/${encodeURIComponent(frame_key)}`,
    details: (frame_key) =>
        `${gallery_href()}/${encodeURIComponent(frame_key)}/details`,
    artwork_list: () => `${gallery_href()}/artworks`,
    artwork_details: (frame_key) =>
        `${gallery_href()}/artworks/${encodeURIComponent(frame_key)}`,
}

export const Model = Schema.Struct({
    path: Schema.String,
    gallery: Gallery.Model,
})
export type Model = typeof Model.Type
export const Message = Gallery.Message
export type Message = Gallery.Message

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const path_for_route = (route: DesktopRoute) =>
    route._tag === "Labs" && is_gallery_path(route.labs_path)
        ? route.labs_path.replace(/\/$/, "")
        : ""

const gallery_route = (path: string) =>
    Gallery.urlToGallery3dEditRoute(
        Url.make({
            protocol: "http:",
            host: "gallery.local",
            port: Option.none(),
            pathname: path.replace(gallery_path, "/3d-gallery-edit"),
            hash: Option.none(),
            search: Option.none(),
        })
    )

export const init = (route: DesktopRoute): UpdateReturn => {
    const [gallery] = Gallery.init()
    const path = path_for_route(route)
    if (path === "") return [{ path, gallery }, []]
    const [routed, commands] = Gallery.update(
        gallery,
        Gallery.ChangedGalleryRoute({ route: gallery_route(path) }),
        hrefs
    )
    return [{ path, gallery: routed }, commands]
}

export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn => {
    const path = path_for_route(route)
    if (path === model.path) return [model, []]
    if (path === "" || model.path === "") return init(route)
    const [gallery, commands] = Gallery.update(
        model.gallery,
        Gallery.ChangedGalleryRoute({ route: gallery_route(path) }),
        hrefs
    )
    return [{ path, gallery }, commands]
}

export const update = (model: Model, message: Message): UpdateReturn => {
    if (model.path === "") return [model, []]
    const [gallery, commands] = Gallery.update(model.gallery, message, hrefs)
    return [{ ...model, gallery }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6")],
        [
            h.h1(
                [h.Class("text-2xl font-semibold")],
                [model.gallery.grid_view ? "Artwork list" : "3D Gallery"]
            ),
            Gallery.view(model.gallery, (message) => message, h, hrefs),
        ]
    )
)
