import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as MusicNotation from "@urm/features/labs/music-notation"
import type { DesktopRoute } from "../../routing/route.ts"

export const music_notation_href = () => "/labs/media/music-notation"
export const is_music_notation_path = MusicNotation.isMusicNotationPath

export const Model = Schema.Struct({
    active: Schema.Boolean,
    notation: MusicNotation.Model,
})
export type Model = typeof Model.Type
export const Message = MusicNotation.Message
export type Message = MusicNotation.Message

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_music_notation_path(route.labs_path),
    notation: MusicNotation.init()[0],
})

export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn => {
    const active =
        route._tag === "Labs" && is_music_notation_path(route.labs_path)
    if (active === model.active) return [model, []]
    const commands = model.active
        ? MusicNotation.update(model.notation, { _tag: "ClickedStop" })[1]
        : []
    return [init(route), commands]
}

export const update = (model: Model, message: Message): UpdateReturn => {
    if (!model.active) return [model, []]
    const [notation, commands] = MusicNotation.update(model.notation, message)
    return [{ ...model, notation }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    MusicNotation.view(model.notation, (message) => message, h)
)
