import { Schema } from "effect"
import { Submodel } from "foldkit"
import * as Gallery from "@urm/features/labs/gallery-view-transitions"
import "@urm/features/labs/gallery-view-transitions/styles.css"
import type { DesktopRoute } from "../../routing/route.ts"

export const gallery_href = () => "/media/gallery-view-transitions"
export const is_gallery_path = (path: string) =>
    path.replace(/\/$/, "") === "/media/gallery-view-transitions"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    gallery: Gallery.Model,
})
export type Model = typeof Model.Type
export const Message = Gallery.Message
export type Message = Gallery.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_gallery_path(route.labs_path),
    gallery: Gallery.init,
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Labs" && is_gallery_path(route.labs_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<never>] => {
    if (!model.active) return [model, []]
    const [gallery, commands] = Gallery.update(model.gallery, message)
    return [{ ...model, gallery }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    Gallery.view(model.gallery, h)
)
