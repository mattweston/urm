import { Schema } from "effect"

import {
    ContactName,
    ContactPhone,
    ContactTitle,
    ContactCompany,
} from "./contact-import.ts"

import { Email } from "./schemas/contacts.ts"

import { RawRow } from "./schemas/data-tables.ts"

export const ContactEmailInput = Schema.Struct({
    email: Email,
    is_primary: Schema.Boolean,
})
export const ContactEmails = Schema.Array(ContactEmailInput).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(20),
    Schema.makeFilter(
        (emails) =>
            emails.filter((item) => item.is_primary).length === 1 &&
            new Set(emails.map((item) => item.email)).size === emails.length,
        {
            message:
                "Choose unique email addresses and exactly one primary address",
        }
    )
)
export const ContactDetails = Schema.Struct({
    name: ContactName,
    email_addresses: ContactEmails,
    tel: Schema.NullOr(ContactPhone),
    title: Schema.NullOr(ContactTitle),
    company: Schema.NullOr(ContactCompany),
})
export type ContactDetails = typeof ContactDetails.Type
export const ContactEmailRecord = Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    is_primary: Schema.Boolean,
})

export const ContactRecord = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.String,
    domain_id: Schema.String,
    name: Schema.String,
    tel: Schema.NullOr(Schema.String),
    title: Schema.NullOr(Schema.String),
    company: Schema.NullOr(Schema.String),
    email: Schema.NullOr(Schema.String),
    email_addresses: Schema.Array(ContactEmailRecord),
    updated_at: Schema.Number,
})
export type ContactRecord = typeof ContactRecord.Type

export const CreateContactCommand = Schema.Struct({
    id: Schema.String.check(
        Schema.isPattern(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        )
    ),
    domain_id: Schema.String,
    name: ContactName,
    email_addresses: Schema.optional(ContactEmails),
    tel: Schema.optional(Schema.NullOr(ContactPhone)),
    title: Schema.optional(Schema.NullOr(ContactTitle)),
    company: Schema.optional(Schema.NullOr(ContactCompany)),
    email: Schema.Trimmed.check(
        Schema.isLowercased(),
        Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Schema.isMaxLength(255)
    ),
})
export type CreateContactCommand = typeof CreateContactCommand.Type

export const ImportContactsCommand = Schema.Struct({
    domain_id: Schema.String,
    source_id: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
    rows: Schema.Array(RawRow).check(
        Schema.isMinLength(1),
        Schema.isMaxLength(200)
    ),
})
export type ImportContactsCommand = typeof ImportContactsCommand.Type

export type ContactEmailInput = typeof ContactEmailInput.Type

export type ContactEmails = typeof ContactEmails.Type

export type ContactEmailRecord = typeof ContactEmailRecord.Type

export class ContactWriteError extends Schema.TaggedError<ContactWriteError>()(
    "ContactWriteError",
    { message: Schema.String }
) {}
