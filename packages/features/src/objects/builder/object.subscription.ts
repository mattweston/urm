import { Subscription } from "foldkit"
import * as Ui from "@foldkit/ui"

import { GotDragAndDropMessage, type Message } from "./object.message.ts"
import type { Model } from "./object.model.ts"

export const subscriptions = Subscription.lift({
    formsObjectBuilderPointer: Ui.DragAndDrop.subscriptions.documentPointer,
    formsObjectBuilderEscape: Ui.DragAndDrop.subscriptions.documentEscape,
    formsObjectBuilderKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
    formsObjectBuilderAutoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
    toChildModel: (model) => model.drag_and_drop,
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
})
