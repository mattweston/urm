import { Option, Schema } from "effect"
import { Submodel, Subscription } from "foldkit"
import type { Command } from "foldkit"
import * as Charting from "@urm/features/labs/stats/charting"
import type { DesktopRoute } from "../../routing/route.ts"

export const charting_href = () => "/labs/stats/charting"
export const is_charting_path = Charting.isChartingPath
export const Model = Schema.Struct({
    active: Schema.Boolean,
    charting: Charting.Model,
})
export type Model = typeof Model.Type
export const Message = Charting.Message
export type Message = Charting.Message

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const is_active = (route: DesktopRoute) =>
    route._tag === "Labs" && is_charting_path(route.labs_path)

export const init = (route: DesktopRoute): UpdateReturn => {
    const active = is_active(route)
    const [initial_model] = Charting.init()
    const [charting, commands] = active
        ? Charting.update(initial_model, Charting.ClickedRefresh())
        : [initial_model, []]
    return [{ active, charting }, commands]
}

export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn =>
    is_active(route) === model.active ? [model, []] : init(route)

export const update = (model: Model, message: Message): UpdateReturn => {
    if (!model.active) return [model, []]
    const [charting, commands] = Charting.update(model.charting, message)
    return [{ ...model, charting }, commands]
}

export const subscriptions = Subscription.lift(Charting.subscriptions)<
    Model,
    Message
>({
    read: (model) => Option.some(model.charting),
    toParentMessage: (message) => message,
    when: (model) => model.active,
})

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6")],
        [Charting.view(model.charting, (message) => message, h)]
    )
)
