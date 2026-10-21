import { Option } from "effect"
import { Subscription } from "foldkit"
import * as Ui from "@foldkit/ui"

import { GotDragAndDropMessage } from "./gallery.message.ts"

export const subscriptions = Subscription.lift({
    dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
    dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
    dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
    autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<import("./gallery.model.ts").Model, typeof GotDragAndDropMessage.Type>({
    read: (model) => Option.some(model.dragAndDrop),
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
})
