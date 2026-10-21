import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { SendRecipient } from "./send.model.ts"

export const SendRecipientsRequested = taggedStruct("SendRecipientsRequested", {
    domain_id: S.String,
})
export const SendRecipientsLoaded = taggedStruct("SendRecipientsLoaded", {
    domain_id: S.String,
    recipients: S.Array(SendRecipient),
})
export const SendRecipientsFailed = taggedStruct("SendRecipientsFailed", {
    domain_id: S.String,
    error: S.String,
})

export const SelectedSendContactChanged = taggedStruct(
    "SelectedSendContactChanged",
    {
        contactId: S.String,
    }
)

export const SelectedSendModeChanged = taggedStruct("SelectedSendModeChanged", {
    mode: S.Literals(["one_off", "template"]),
})

export const SelectedSendTemplateChanged = taggedStruct(
    "SelectedSendTemplateChanged",
    {
        templateId: S.String,
    }
)

export const UpdatedSingleEmail = taggedStruct("UpdatedSingleEmail", {
    field: S.Literals(["subject", "bodyText"]),
    value: S.String,
})

export const SubmittedSingleEmail = taggedStruct("SubmittedSingleEmail")

export const SingleEmailSent = taggedStruct("SingleEmailSent", {
    status: S.String,
})

export const SingleEmailFailed = taggedStruct("SingleEmailFailed", {
    error: S.String,
})

export const Message = S.Union([
    SendRecipientsRequested,
    SendRecipientsLoaded,
    SendRecipientsFailed,
    SelectedSendContactChanged,
    SelectedSendModeChanged,
    SelectedSendTemplateChanged,
    UpdatedSingleEmail,
    SubmittedSingleEmail,
    SingleEmailSent,
    SingleEmailFailed,
])

export type Message = typeof Message.Type
