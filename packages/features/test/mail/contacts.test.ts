import { describe, expect, test } from "vitest"

import * as Contacts from "@urm/features/mail/contacts"

describe("mail contacts", () => {
    test("does not duplicate a contact already received from a reactive load", () => {
        const contact = {
            id: "contact-1",
            name: "Test Contact",
            email: "test@example.com",
            email_addresses: [
                {
                    id: "email-1",
                    email: "test@example.com",
                    is_primary: true,
                },
            ],
            tel: "",
            title: "",
            company: "",
            updatedAt: 1,
        }
        const [initial] = Contacts.init("domain-1")
        const [loaded] = Contacts.update(
            initial,
            Contacts.ContactsLoaded({ contacts: [contact] })
        )
        const [created] = Contacts.update(
            loaded,
            Contacts.ContactCreated({ contact })
        )

        expect(created.contacts).toEqual([contact])
    })

    test("edits multiple addresses while preserving one primary address", () => {
        const [initial] = Contacts.init("domain-1")
        const [with_second] = Contacts.update(
            initial,
            Contacts.AddedContactEmailAddress()
        )
        const [with_first_value] = Contacts.update(
            with_second,
            Contacts.UpdatedContactEmailAddress({
                index: 0,
                value: "first@example.com",
            })
        )
        const [with_values] = Contacts.update(
            with_first_value,
            Contacts.UpdatedContactEmailAddress({
                index: 1,
                value: "main@example.com",
            })
        )
        const [with_primary] = Contacts.update(
            with_values,
            Contacts.ChangedPrimaryContactEmail({ index: 1 })
        )

        expect(with_primary.contactDraft.email_addresses).toEqual([
            { email: "first@example.com", is_primary: false },
            { email: "main@example.com", is_primary: true },
        ])
    })

    test("promotes the first remaining address when primary is removed", () => {
        const [initial] = Contacts.init("domain-1")
        const [with_second] = Contacts.update(
            initial,
            Contacts.AddedContactEmailAddress()
        )
        const [remaining] = Contacts.update(
            with_second,
            Contacts.RemovedContactEmailAddress({ index: 0 })
        )

        expect(remaining.contactDraft.email_addresses).toEqual([
            { email: "", is_primary: true },
        ])
    })
})
