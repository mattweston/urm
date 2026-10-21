import { Subscription } from "foldkit"
import type { AppModel } from "./app.model.ts"
import type { AppMessage } from "./app.message.ts"

export const subscriptions = Subscription.make<AppModel, AppMessage>()(
    () => ({})
)
