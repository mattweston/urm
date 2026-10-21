import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Contact } from "./contacts.data.ts"

export const ContactsSearchChanged = taggedStruct("ContactsSearchChanged", {
    value: S.String,
})

export const UpdatedContactDraft = taggedStruct("UpdatedContactDraft", {
    field: S.Union([
        S.Literal("name"),
        S.Literal("tel"),
        S.Literal("title"),
        S.Literal("company"),
    ]),
    value: S.String,
})

export const AddedContactEmailAddress = taggedStruct("AddedContactEmailAddress")

export const RemovedContactEmailAddress = taggedStruct(
    "RemovedContactEmailAddress",
    {
        index: S.Number,
    }
)

export const UpdatedContactEmailAddress = taggedStruct(
    "UpdatedContactEmailAddress",
    {
        index: S.Number,
        value: S.String,
    }
)

export const ChangedPrimaryContactEmail = taggedStruct(
    "ChangedPrimaryContactEmail",
    {
        index: S.Number,
    }
)

export const SelectedContactChanged = taggedStruct("SelectedContactChanged", {
    contactId: S.String,
})

export const ClickedCreateContact = taggedStruct("ClickedCreateContact")

export const ClickedEditContact = taggedStruct("ClickedEditContact", {
    contactId: S.String,
})

export const ClickedDeleteContact = taggedStruct("ClickedDeleteContact", {
    contactId: S.String,
})

export const ClosedContactDialog = taggedStruct("ClosedContactDialog")

export const SubmittedContactForm = taggedStruct("SubmittedContactForm")

export const ConfirmedDeleteContact = taggedStruct("ConfirmedDeleteContact")

export const ContactsLoaded = taggedStruct("ContactsLoaded", {
    contacts: S.Array(Contact),
})

export const ContactCreated = taggedStruct("ContactCreated", {
    contact: Contact,
})

export const ContactUpdated = taggedStruct("ContactUpdated", {
    contact: Contact,
})

export const ContactDeleted = taggedStruct("ContactDeleted", {
    contactId: S.String,
})

export const ContactsActionFailed = taggedStruct("ContactsActionFailed", {
    action: S.Union([
        S.Literal("load"),
        S.Literal("create"),
        S.Literal("update"),
        S.Literal("delete"),
    ]),
    error: S.String,
})

export const Message = S.Union([
    ContactsSearchChanged,
    UpdatedContactDraft,
    AddedContactEmailAddress,
    RemovedContactEmailAddress,
    UpdatedContactEmailAddress,
    ChangedPrimaryContactEmail,
    SelectedContactChanged,
    ClickedCreateContact,
    ClickedEditContact,
    ClickedDeleteContact,
    ClosedContactDialog,
    SubmittedContactForm,
    ConfirmedDeleteContact,
    ContactsLoaded,
    ContactCreated,
    ContactUpdated,
    ContactDeleted,
    ContactsActionFailed,
])

export type Message = typeof Message.Type
