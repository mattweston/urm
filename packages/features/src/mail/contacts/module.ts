import { Model } from "./contacts.model.ts"
import { Message } from "./contacts.message.ts"
import { init, update } from "./contacts.update.ts"
import { view } from "./contacts.view.ts"

export const module = {
    name: "contacts",
    model: Model,
    message: Message,
    init: () => init(""),
    update,
    view,
} as const
