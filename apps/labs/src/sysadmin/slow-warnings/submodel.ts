import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as SlowWarnings from "@urm/features/labs/slow-warnings"
import type { DesktopRoute } from "../../routing/route.ts"

export const slow_warnings_href = () => "/labs/sysadmin/slow-warnings"
export const is_slow_warnings_path = (path: string) =>
    path.replace(/\/$/, "") === "/labs/sysadmin/slow-warnings"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    warnings: SlowWarnings.Model,
})
export type Model = typeof Model.Type
export const Message = SlowWarnings.Message
export type Message = SlowWarnings.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_slow_warnings_path(route.labs_path),
    warnings: SlowWarnings.init()[0],
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active =
        route._tag === "Labs" && is_slow_warnings_path(route.labs_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (!model.active) return [model, []]
    const [warnings, commands] = SlowWarnings.update(model.warnings, message)
    return [{ ...model, warnings }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-4xl px-4 py-6 sm:px-6")],
        [SlowWarnings.view(model.warnings, (message) => message, h)]
    )
)

export const subscriptions = SlowWarnings.subscriptions
export const handle_slow = SlowWarnings.handleSlow
