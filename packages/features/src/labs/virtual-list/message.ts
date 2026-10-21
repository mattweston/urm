import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { ClickedScrollToMiddle, ClickedVariableScrollToMiddle } from "./view.ts"

export { ClickedScrollToMiddle, ClickedVariableScrollToMiddle } from "./view.ts"

export const GotFixedMessage = taggedStruct("GotFixedMessage", {
    message: Ui.VirtualList.Message,
})
export const GotVariableMessage = taggedStruct("GotVariableMessage", {
    message: Ui.VirtualList.Message,
})

export const Message = S.Union([
    GotFixedMessage,
    GotVariableMessage,
    ClickedScrollToMiddle,
    ClickedVariableScrollToMiddle,
])
export type Message = typeof Message.Type
