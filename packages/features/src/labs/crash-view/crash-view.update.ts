import { Command } from "foldkit"
import type { Model } from "./crash-view.model.ts"
import { type Message } from "./crash-view.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [null, []]

export const update = (_model: Model, _message: Message): UpdateReturn => {
    throw new Error("This is a simulated crash!")
}
