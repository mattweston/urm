import { Option } from "effect"
import { Subscription } from "foldkit"
import * as Ui from "@foldkit/ui"

import { GotFixedMessage, GotVariableMessage, Message } from "./message.ts"
import { Model } from "./model.ts"

// Both lists stay unmeasured until their container reports a height, and an
// unmeasured list renders no rows at all. The resize half of this is what makes
// the demo visible; the scroll half is what keeps it in sync.
export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly read: (parentModel: ParentModel) => Option.Option<Model>
    readonly toParentMessage: (message: Message) => ParentMessage
}) => {
    const listSubscriptions = Subscription.aggregate<Model, Message>()(
        Subscription.lift({
            labsVirtualListFixedContainer:
                Ui.VirtualList.subscriptions.containerEvents,
        })({
            read: (model: Model) => Option.some(model.fixed),
            toParentMessage: (message) => GotFixedMessage({ message }),
        }),
        Subscription.lift({
            labsVirtualListVariableContainer:
                Ui.VirtualList.subscriptions.containerEvents,
        })({
            read: (model: Model) => Option.some(model.variable),
            toParentMessage: (message) => GotVariableMessage({ message }),
        })
    )

    const lifted = Subscription.lift(listSubscriptions)<
        ParentModel,
        ParentMessage
    >(config)

    return lifted
}
