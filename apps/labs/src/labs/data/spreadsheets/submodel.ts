import { Schema } from "effect"
import { Submodel, Subscription } from "foldkit"
import type { Command } from "foldkit"
import * as Spreadsheet from "@urm/features/spreadsheet"
import type { DesktopRoute } from "../../../routing/route.ts"

export const spreadsheets_href = () => "/labs/data/spreadsheets"
export const is_spreadsheets_path = (path: string) =>
    path.replace(/\/$/, "") === "/labs/data/spreadsheets"
const active_for_route = (route: DesktopRoute) =>
    route._tag === "Labs" && is_spreadsheets_path(route.labs_path)

export const Model = Schema.Struct({
    active: Schema.Boolean,
    initialized: Schema.Boolean,
    spreadsheet: Spreadsheet.Model,
})
export type Model = typeof Model.Type
export const Message = Spreadsheet.Message
export type Message = Spreadsheet.SpreadsheetMessage

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
export const init = (route: DesktopRoute): UpdateReturn => {
    const active = active_for_route(route)
    const [spreadsheet, commands] = Spreadsheet.init()
    return [
        { active, initialized: active, spreadsheet },
        active ? commands : [],
    ]
}
export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn => {
    const active = active_for_route(route)
    if (active === model.active) return [model, []]
    if (active && !model.initialized) return init(route)
    return [{ ...model, active }, []]
}
export const update = (model: Model, message: Message): UpdateReturn => {
    const [spreadsheet, commands] = Spreadsheet.update(
        model.spreadsheet,
        message
    )
    return [{ ...model, spreadsheet }, model.active ? commands : []]
}
export const subscriptions = Subscription.lift(Spreadsheet.subscriptions)<
    Model,
    Message
>({
    toChildModel: (model) => model.spreadsheet,
    toParentMessage: (message) => message,
    when: (model) => model.active,
})
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.submodel({
        slotId: "labs-freeform-spreadsheet",
        model: model.spreadsheet,
        view: Spreadsheet.view,
        toParentMessage: (message) => message,
    })
)
