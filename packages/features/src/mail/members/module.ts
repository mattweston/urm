import { Model } from "./members.model.ts"
import { Message } from "./members.message.ts"
import { init, update } from "./members.update.ts"
import { view } from "./members.view.ts"

export const module = {
    name: "members",
    model: Model,
    message: Message,
    init,
    update,
    view,
} as const
