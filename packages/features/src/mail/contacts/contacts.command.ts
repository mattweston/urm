/**
 * # Contacts Commands
 *
 * Each command wraps an Effect and names the two messages it can produce, so a
 * result re-enters update through the same door as a click.
 *
 * Note String(error) discards the tagged error's _tag, so the view cannot tell
 * a conflict from a permissions failure.
 */

import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    ContactCreated,
    ContactDeleted,
    ContactUpdated,
    ContactsActionFailed,
    ContactsLoaded,
} from "./contacts.message.ts"
import { ContactDraft } from "./contacts.data.ts"

type ContactAction = "create" | "delete" | "load" | "update"

const unavailable = (action: ContactAction) =>
    Effect.succeed(
        ContactsActionFailed({
            action,
            error: "No contacts persistence adapter installed",
        })
    )

export const LoadContacts = Command.define("LoadContacts", {
    args: { domain_id: S.String },
    messages: [ContactsLoaded, ContactsActionFailed],
    execute: () => unavailable("load"),
})
export const CreateContact = Command.define("CreateContact", {
    args: { domain_id: S.String, draft: ContactDraft },
    messages: [ContactCreated, ContactsActionFailed],
    execute: () => unavailable("create"),
})
export const UpdateContact = Command.define("UpdateContact", {
    args: { domain_id: S.String, contactId: S.String, draft: ContactDraft },
    messages: [ContactUpdated, ContactsActionFailed],
    execute: () => unavailable("update"),
})
export const DeleteContact = Command.define("DeleteContact", {
    args: { domain_id: S.String, contactId: S.String },
    messages: [ContactDeleted, ContactsActionFailed],
    execute: () => unavailable("delete"),
})
