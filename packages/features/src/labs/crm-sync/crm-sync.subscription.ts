import { Option } from "effect"
import { Subscription } from "foldkit"
import { VirtualList } from "@foldkit/ui"

import { GotSyncVirtualListMessage } from "./crm-sync.message.ts"
import type { Message } from "./crm-sync.message.ts"
import type { Model } from "./crm-sync.model.ts"

// Scroll position and container height are the only inputs the list itself
// takes: neither is a click, so neither can arrive through the view.
export const subscriptions = Subscription.lift({
    crmSyncContactsListEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
    read: (model) => Option.some(model.list),
    toParentMessage: (message) => GotSyncVirtualListMessage({ message }),
})
