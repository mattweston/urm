import { Model } from "./gallery.model.ts"
import { Message } from "./gallery.message.ts"
import { init, update } from "./gallery.update.ts"
import { view } from "./gallery.view.ts"

export const module = {
    name: "media-gallery",
    model: Model,
    message: Message,
    init: () => init(),
    update,
    view,
} as const
