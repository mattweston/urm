import { Subscription } from "foldkit"
import { VirtualList } from "@foldkit/ui"

import { GotVirtualListMessage } from "./crm.message.ts"
import type { Message } from "./crm.message.ts"
import type { Model } from "./crm.model.ts"

export const subscriptions = Subscription.lift({
    crmContactsListEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
    toChildModel: (model) => model.list,
    toParentMessage: (message) => GotVirtualListMessage({ message }),
})
