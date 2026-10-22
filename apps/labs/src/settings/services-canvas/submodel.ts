import { Schema } from "effect"
import { Submodel } from "foldkit"
import * as ServicesCanvas from "@urm/features/labs/settings/services-canvas"
import type { DesktopRoute } from "../../routing/route.ts"

export const services_canvas_href = () => "/settings/services-canvas"
export const is_services_canvas_path = (path: string) =>
    path.replace(/\/$/, "") === "/settings/services-canvas"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    canvas: ServicesCanvas.Model,
})
export type Model = typeof Model.Type
export const Message = ServicesCanvas.Message
export type Message = ServicesCanvas.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_services_canvas_path(route.labs_path),
    canvas: ServicesCanvas.initial_model,
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const next = init(route)
    return next.active === model.active ? model : next
}

export const update = (model: Model, message: Message): Model =>
    model.active
        ? { ...model, canvas: ServicesCanvas.update(model.canvas, message) }
        : model

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.section(
        [h.Class("mx-auto w-full max-w-6xl space-y-6 px-6 py-8")],
        [
            h.h1([h.Class("text-2xl font-semibold")], ["Services Canvas"]),
            ServicesCanvas.view(model.canvas, h),
        ]
    )
)
