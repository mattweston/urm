import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import { Subscription } from "foldkit"
import { GotDragAndDropMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

export const subscriptions = Subscription.lift({
    labsDragAndDropPointer: Ui.DragAndDrop.subscriptions.documentPointer,
    labsDragAndDropEscape: Ui.DragAndDrop.subscriptions.documentEscape,
    labsDragAndDropKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
    labsDragAndDropAutoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
    read: (model) => Option.some(model.dragAndDrop),
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
})
