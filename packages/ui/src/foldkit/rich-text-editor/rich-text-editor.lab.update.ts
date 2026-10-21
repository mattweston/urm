import { Command } from "foldkit"
import {
    initRichTextEditor,
    updateRichTextEditor,
} from "./rich-text-editor.view.ts"
import type { Model } from "./rich-text-editor.lab.model.ts"
import type { Message } from "./rich-text-editor.lab.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [initRichTextEditor(), []]

export const update = (model: Model, message: Message): UpdateReturn => {
    const [nextModel, commands] = updateRichTextEditor(model, message)
    return [nextModel, commands]
}
