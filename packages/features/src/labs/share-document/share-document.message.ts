import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

export const GotPermissionListboxMessage = taggedStruct(
    "GotPermissionListboxMessage",
    {
        personIndexId: S.Number,
        message: Ui.Listbox.Message,
    }
)

export const UpdatedPermission = taggedStruct("UpdatedPermission", {
    index: S.Number,
    value: S.String,
})

export const Message = S.Union([GotPermissionListboxMessage, UpdatedPermission])

export type Message = typeof Message.Type
