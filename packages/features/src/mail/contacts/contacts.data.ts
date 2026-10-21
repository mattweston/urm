/**
 * # Contacts Data
 *
 * The UI's own contact type, distinct from the domain schema: optional fields
 * become required empty strings, because a form field is never absent.
 *
 * This is also the only place trimming and lowercasing happen. Domain
 * validation rejects rather than normalises, so an input built without going
 * through these converters fails on whitespace the user cannot see.
 */

import { Schema as S } from "effect"
import {
    Contact as RemoteContact,
    PhoneNumber,
} from "@urm/domain/schemas/contacts"

export const ContactEmailAddress = S.Struct({
    id: S.String,
    email: S.String,
    is_primary: S.Boolean,
})

export type ContactEmailAddress = typeof ContactEmailAddress.Type

export const ContactEmailAddressDraft = S.Struct({
    email: S.String,
    is_primary: S.Boolean,
})

export type ContactEmailAddressDraft = typeof ContactEmailAddressDraft.Type

export const Contact = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
    email_addresses: S.Array(ContactEmailAddress),
    tel: S.String,
    title: S.String,
    company: S.String,
    updatedAt: S.Number,
})

export type Contact = typeof Contact.Type

export const ContactDraft = S.Struct({
    name: S.String,
    email_addresses: S.Array(ContactEmailAddressDraft),
    tel: S.String,
    title: S.String,
    company: S.String,
})

export type ContactDraft = typeof ContactDraft.Type

const nullableText = (value: string) => {
    const trimmed = value.trim()

    return trimmed.length === 0 ? undefined : trimmed
}

const nullableEmailText = (value: string) => {
    const trimmed = value.trim().toLowerCase()

    return trimmed.length === 0 ? undefined : trimmed
}

export const blankContactDraft = (): ContactDraft => ({
    name: "",
    email_addresses: [{ email: "", is_primary: true }],
    tel: "",
    title: "",
    company: "",
})

export const contactDraftFromContact = (contact: Contact): ContactDraft => ({
    name: contact.name,
    email_addresses: contact.email_addresses.map(({ email, is_primary }) => ({
        email,
        is_primary,
    })),
    tel: contact.tel,
    title: contact.title,
    company: contact.company,
})

export const contactFromDraft = (
    draft: ContactDraft,
    id: string,
    updatedAt: number
): Contact => ({
    id,
    name: draft.name.trim(),
    email: primaryContactEmail(draft.email_addresses),
    email_addresses: draft.email_addresses.map(
        ({ email, is_primary }, index) => ({
            id: `${id}-email-${index}`,
            email,
            is_primary,
        })
    ),
    tel: draft.tel,
    title: draft.title,
    company: draft.company,
    updatedAt,
})

export const toUiContact = (contact: RemoteContact): Contact => {
    const email = contact.email ?? ""

    return {
        id: contact.id,
        name: contact.name,
        email,
        email_addresses:
            email === ""
                ? []
                : [{ id: `${contact.id}-primary`, email, is_primary: true }],
        tel: contact.tel ?? "",
        title: contact.title ?? "",
        company: contact.company ?? "",
        updatedAt: contact.updated_at,
    }
}

export const toUiContacts = (
    contacts: ReadonlyArray<RemoteContact>
): ReadonlyArray<Contact> => contacts.map(toUiContact)

// Spread-or-omit, not `email: undefined`: the domain input uses Schema.optional,
// which requires the key to be absent rather than present-and-undefined.
export const toCreateContactInput = (draft: ContactDraft) => ({
    name: draft.name.trim(),
    ...(nullableEmailText(primaryContactEmail(draft.email_addresses)) ===
    undefined
        ? {}
        : {
              email: nullableEmailText(
                  primaryContactEmail(draft.email_addresses)
              ),
          }),
    ...(nullableText(draft.tel) === undefined
        ? {}
        : { tel: nullableText(draft.tel) }),
    ...(nullableText(draft.title) === undefined
        ? {}
        : { title: nullableText(draft.title) }),
    ...(nullableText(draft.company) === undefined
        ? {}
        : { company: nullableText(draft.company) }),
})

export const toUpdateContactInput = (
    draft: ContactDraft,
    updated_at: number
) => ({
    name: draft.name.trim(),
    ...(nullableEmailText(primaryContactEmail(draft.email_addresses)) ===
    undefined
        ? {}
        : {
              email: nullableEmailText(
                  primaryContactEmail(draft.email_addresses)
              ),
          }),
    ...(nullableText(draft.tel) === undefined
        ? {}
        : { tel: S.decodeUnknownSync(PhoneNumber)(nullableText(draft.tel)) }),
    ...(nullableText(draft.title) === undefined
        ? {}
        : { title: nullableText(draft.title) }),
    ...(nullableText(draft.company) === undefined
        ? {}
        : { company: nullableText(draft.company) }),
    updated_at,
})

export const primaryContactEmail = (
    email_addresses: ReadonlyArray<ContactEmailAddressDraft>
): string =>
    email_addresses.find(({ is_primary }) => is_primary)?.email ??
    email_addresses[0]?.email ??
    ""
