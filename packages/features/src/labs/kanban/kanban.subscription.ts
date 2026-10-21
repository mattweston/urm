import { Subscription } from "foldkit"
import { DragAndDrop } from "@foldkit/ui"
import { GotDragAndDropMessage } from "./kanban.message.ts"
import type { Message } from "./kanban.message.ts"
import type { Model } from "./kanban.model.ts"

export const subscriptions = Subscription.lift({
    kanbanDragPointer: DragAndDrop.subscriptions.documentPointer,
    kanbanDragEscape: DragAndDrop.subscriptions.documentEscape,
    kanbanDragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
    kanbanAutoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
    toChildModel: (model) => model.dragAndDrop,
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
})
