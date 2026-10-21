import { Subscription } from "foldkit"

import { TickedCanvasArtFrame, type CanvasArtMessage } from "./message.ts"
import type { Model } from "./model.ts"

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: CanvasArtMessage) => ParentMessage
    readonly isRouteActive: (parentModel: ParentModel) => boolean
}) =>
    Subscription.make<ParentModel, ParentMessage>()(() => ({
        canvasArtFrame: Subscription.animationFrame({
            isActive: (model) =>
                config.isRouteActive(model) &&
                config.toChildModel(model).isRunning,
            toMessage: (deltaTime) =>
                config.toParentMessage(TickedCanvasArtFrame({ deltaTime })),
        }),
    }))
