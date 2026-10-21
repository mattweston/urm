import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Contact, ContactDraft } from "./contacts.data.ts"

export const ContactsDialogClosed = taggedStruct("ContactsDialogClosed")

export const ContactsDialogCreate = taggedStruct("ContactsDialogCreate")

export const ContactsDialogEdit = taggedStruct("ContactsDialogEdit", {
    contactId: S.String,
})

export const ContactsDialogDelete = taggedStruct("ContactsDialogDelete", {
    contactId: S.String,
})

export const ContactsDialog = S.Union([
    ContactsDialogClosed,
    ContactsDialogCreate,
    ContactsDialogEdit,
    ContactsDialogDelete,
])

export const Model = S.Struct({
    domain_id: S.String,
    contacts: S.Array(Contact),
    contactsLoaded: S.Boolean,
    contactsSearch: S.String,
    selectedContactId: S.String,
    contactsDialog: ContactsDialog,
    contactDraft: ContactDraft,
})

export type Model = typeof Model.Type
