import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as VariableFonts from "@urm/features/labs/typography/variable-fonts"
import "./styles.css"
import type { DesktopRoute } from "../../../routing/route.ts"

export const variable_fonts_href = () => "/labs/typography/variable-fonts"
export const is_variable_fonts_path = VariableFonts.isVariableFontsPath

export const Model = Schema.Struct({
    active: Schema.Boolean,
    fonts: VariableFonts.Model,
})
export type Model = typeof Model.Type
export const Message = VariableFonts.Message
export type Message = VariableFonts.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_variable_fonts_path(route.labs_path),
    fonts: VariableFonts.init()[0],
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active =
        route._tag === "Labs" && is_variable_fonts_path(route.labs_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (!model.active) return [model, []]
    const [fonts, commands] = VariableFonts.update(model.fonts, message)
    return [{ ...model, fonts }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-4xl px-4 py-6 sm:px-6")],
        [VariableFonts.view(model.fonts, (message) => message, h)]
    )
)
