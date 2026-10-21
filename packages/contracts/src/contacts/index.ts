import {
    ContactDetails,
    ContactRecord,
    CreateContactCommand,
    ImportContactsCommand,
} from "@urm/domain/contacts"
export {
    ContactEmailInput,
    ContactEmails,
    ContactDetails,
    ContactEmailRecord,
    ContactRecord,
    CreateContactCommand,
    ImportContactsCommand,
} from "@urm/domain/contacts"
import { ContactName } from "@urm/domain/contact-import"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const RemoteContact = Entity.make("Contact", ContactRecord)
export const ContactSummary = RemoteContact.select({
    id: true,
    contact_id: true,
    domain_id: true,
    name: true,
    email: true,
    email_addresses: true,
    tel: true,
    title: true,
    company: true,
    updated_at: true,
})

export const DomainContacts = Query.make("DomainContacts", {
    Input: {
        domain_id: Schema.String,
        search: Schema.optionalKey(
            Schema.String.check(Schema.isMaxLength(255))
        ),
    },
    Result: RemoteContact,
})
export const CreateRemoteContact = Mutation.make("CreateContact", {
    Input: CreateContactCommand.fields,
    Output: { id: Schema.String },
})
export const RenameRemoteContact = Mutation.make("RenameContact", {
    Input: { id: Schema.String, domain_id: Schema.String, name: ContactName },
    Output: { id: Schema.String },
})
export const UpdateRemoteContact = Mutation.make("UpdateContact", {
    Input: {
        id: Schema.String,
        domain_id: Schema.String,
        ...ContactDetails.fields,
    },
    Output: { id: Schema.String },
})
export const DeleteRemoteContact = Mutation.make("DeleteContact", {
    Input: { id: Schema.String, domain_id: Schema.String },
    Output: { id: Schema.String },
})
export const ImportRemoteContacts = Mutation.make("ImportContacts", {
    Input: ImportContactsCommand.fields,
    Output: { imported: Schema.Number, already_imported: Schema.Boolean },
})
export const ContactsRemote = Remote.define({
    entities: [RemoteContact],
    queries: [DomainContacts],
    mutations: [
        CreateRemoteContact,
        RenameRemoteContact,
        UpdateRemoteContact,
        DeleteRemoteContact,
        ImportRemoteContacts,
    ],
})
