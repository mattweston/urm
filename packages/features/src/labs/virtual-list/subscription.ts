import { Subscription } from "foldkit"
import * as Ui from "@foldkit/ui"

import { GotFixedMessage, GotVariableMessage, Message } from "./message.ts"
import { Model } from "./model.ts"

// Both lists stay unmeasured until their container reports a height, and an
// unmeasured list renders no rows at all. The resize half of this is what makes
// the demo visible; the scroll half is what keeps it in sync.
export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
}) => {
    const listSubscriptions = Subscription.aggregate<Model, Message>()(
        Subscription.lift({
            labsVirtualListFixedContainer:
                Ui.VirtualList.subscriptions.containerEvents,
        })({
            toChildModel: (model: Model) => model.fixed,
            toParentMessage: (message) => GotFixedMessage({ message }),
        }),
        Subscription.lift({
            labsVirtualListVariableContainer:
                Ui.VirtualList.subscriptions.containerEvents,
        })({
            toChildModel: (model: Model) => model.variable,
            toParentMessage: (message) => GotVariableMessage({ message }),
        })
    )

    const lifted = Subscription.lift(listSubscriptions)<
        ParentModel,
        ParentMessage
    >(config)

    return lifted
}
