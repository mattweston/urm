import { describe, expect, test } from "vitest"
import type { EmailSubscription as EmailSubscriptionType } from "@urm/domain/schemas/email"

import {
    SelectedSubscriptionContactChanged,
    SubmittedSubscriptionContact,
    SubmittedSubscriptionsListKey,
    SubscriptionUpdated,
    SubscriptionsLoaded,
    UpdatedSubscriptionsListKey,
} from "./subscriptions.message.ts"
import {
    initDeferred,
    reflectContacts,
    update,
} from "./subscriptions.update.ts"

const contacts = [
    {
        id: "contact-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        email_addresses: [
            {
                id: "email-1",
                email: "ada@example.com",
                is_primary: true,
            },
        ],
        tel: "",
        title: "",
        company: "",
        updatedAt: 1,
    },
    {
        id: "contact-2",
        name: "No Address",
        email: "",
        email_addresses: [],
        tel: "",
        title: "",
        company: "",
        updatedAt: 1,
    },
]

const subscription: EmailSubscriptionType = {
    contact_id: "contact-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    list_key: "newsletter",
    status: "subscribed",
    source: "admin",
    subscribed_at: 1,
}

describe("mail subscriptions", () => {
    test("keeps contacts separate from persisted subscriptions", () => {
        const [initial] = initDeferred()
        const with_contacts = reflectContacts(initial, contacts)
        const [loaded] = update(
            with_contacts,
            SubscriptionsLoaded({ subscriptions: [] })
        )

        expect(loaded.availableContacts).toEqual([
            {
                id: "contact-1",
                name: "Ada Lovelace",
                email: "ada@example.com",
            },
        ])
        expect(loaded.subscriptions).toEqual([])
    })

    test("subscribes only the explicitly selected contact", () => {
        const [initial] = initDeferred()
        const [selected] = update(
            reflectContacts(initial, contacts),
            SelectedSubscriptionContactChanged({ value: "contact-1" })
        )
        const [, commands] = update(selected, SubmittedSubscriptionContact())

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SetSubscriptionStatus")
        expect(commands[0]?.args).toEqual({
            contact_id: "contact-1",
            listKey: "newsletter",
            status: "subscribed",
        })
    })

    test("adds a newly persisted subscription without synthesizing others", () => {
        const [initial] = initDeferred()
        const [updated] = update(initial, SubscriptionUpdated({ subscription }))

        expect(updated.subscriptions).toEqual([subscription])
    })

    test("commits the editable list key only when the form is submitted", () => {
        const [initial] = initDeferred()
        const [editing] = update(
            initial,
            UpdatedSubscriptionsListKey({ value: "product-updates" })
        )
        const [submitted] = update(editing, SubmittedSubscriptionsListKey())

        expect(editing.activeListKey).toBe("newsletter")
        expect(submitted.activeListKey).toBe("product-updates")
    })
})
