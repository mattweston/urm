import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GotFileDropMessage = taggedStruct("GotFileDropMessage", {
    message: Ui.FileDrop.Message,
})
export const ClickedRemoveFile = taggedStruct("ClickedRemoveFile", {
    fileIndex: S.Number,
})

export const Message = S.Union([GotFileDropMessage, ClickedRemoveFile])

export type Message = typeof Message.Type
