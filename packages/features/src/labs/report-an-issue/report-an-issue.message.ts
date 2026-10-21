import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

export const GotAreaListboxMessage = taggedStruct("GotAreaListboxMessage", {
    message: Ui.Listbox.Message,
})

export const GotSecurityLevelListboxMessage = taggedStruct(
    "GotSecurityLevelListboxMessage",
    {
        message: Ui.Listbox.Message,
    }
)

export const UpdatedArea = taggedStruct("UpdatedArea", { value: S.String })
export const UpdatedSecurityLevel = taggedStruct("UpdatedSecurityLevel", {
    value: S.String,
})
export const UpdatedSubject = taggedStruct("UpdatedSubject", {
    value: S.String,
})
export const UpdatedDescription = taggedStruct("UpdatedDescription", {
    value: S.String,
})

export const Message = S.Union([
    GotAreaListboxMessage,
    GotSecurityLevelListboxMessage,
    UpdatedArea,
    UpdatedSecurityLevel,
    UpdatedSubject,
    UpdatedDescription,
])

export type Message = typeof Message.Type
