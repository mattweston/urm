import { Schema } from "effect"
import { Submodel } from "foldkit"
import type { Command } from "foldkit"
import * as Bookmarks from "@urm/features/labs/bookmarks"
import type { DesktopRoute } from "../../routing/route.ts"

export const bookmarks_href = () => "/dev/bookmarks"
export const is_bookmarks_path = (path: string) =>
    path.replace(/\/$/, "") === "/dev/bookmarks"

export const Model = Schema.Struct({
    active: Schema.Boolean,
    bookmarks: Bookmarks.Model,
})
export type Model = typeof Model.Type
export const Message = Bookmarks.Message
export type Message = Bookmarks.Message

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Dev" && is_bookmarks_path(route.dev_path),
    bookmarks: Bookmarks.init()[0],
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Dev" && is_bookmarks_path(route.dev_path)
    return active === model.active ? model : init(route)
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (!model.active) return [model, []]
    const [bookmarks, commands] = Bookmarks.update(model.bookmarks, message)
    return [{ ...model, bookmarks }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto w-full max-w-4xl px-4 py-6 sm:px-6")],
        [Bookmarks.view(model.bookmarks, (message) => message, h)]
    )
)
