import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

export const GotHorizontalTabsMessage = taggedStruct(
    "GotHorizontalTabsMessage",
    {
        message: Ui.Tabs.Message,
    }
)
export const GotVerticalTabsMessage = taggedStruct("GotVerticalTabsMessage", {
    message: Ui.Tabs.Message,
})

export const Message = S.Union([
    GotHorizontalTabsMessage,
    GotVerticalTabsMessage,
])
export type Message = typeof Message.Type
