import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as DomDepth from "@urm/features/labs/dom-depth-visualizer"
import type { DesktopRoute } from "../../../routing/route.ts"

export const dom_depth_href = () => "/labs/design/dom-depth-visualizer"
export const is_dom_depth_path = (path: string) =>
    path.replace(/\/$/, "") === "/labs/design/dom-depth-visualizer"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    visualizer: DomDepth.Model,
})
export type Model = typeof Model.Type
export const Message = DomDepth.Message
export type Message = DomDepth.Message

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (route: DesktopRoute): UpdateReturn => {
    const active = route._tag === "Labs" && is_dom_depth_path(route.labs_path)
    const [visualizer, commands] = DomDepth.init()
    return [{ active, visualizer }, active ? commands : []]
}

export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn => {
    const active = route._tag === "Labs" && is_dom_depth_path(route.labs_path)
    return active === model.active ? [model, []] : init(route)
}

export const update = (model: Model, message: Message): UpdateReturn => {
    if (!model.active) return [model, []]
    const [visualizer, commands] = DomDepth.update(model.visualizer, message)
    return [{ ...model, visualizer }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    DomDepth.view(model.visualizer, (message) => message, h)
)
