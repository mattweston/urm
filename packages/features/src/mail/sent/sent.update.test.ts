import { describe, expect, it } from "vitest"

import { SentDeliveriesFailed, SentDeliveriesLoaded } from "./sent.message.ts"
import type { SentDelivery } from "./sent.model.ts"
import { init, reflectContacts, update } from "./sent.update.ts"

const delivery: SentDelivery = {
    id: "delivery-1",
    contactId: "contact-1",
    subject: "Test subject",
    isTest: false,
    status: "sent",
    providerStatus: "sent",
    recipientDomain: "example.com",
    errorMessage: null,
    createdAt: 1,
    sentAt: 2,
}

describe("sent delivery update", () => {
    it("loads deliveries and reflects current contact details", () => {
        const [initial] = init()
        const with_contacts = reflectContacts(initial, [
            {
                id: "contact-1",
                name: "Test Recipient",
                email: "recipient@example.com",
                email_addresses: [],
                tel: "",
                title: "",
                company: "",
                updatedAt: 1,
            },
        ])
        const [loaded] = update(
            with_contacts,
            SentDeliveriesLoaded({ deliveries: [delivery] })
        )

        expect(loaded).toMatchObject({
            deliveries: [delivery],
            contacts: [
                {
                    id: "contact-1",
                    name: "Test Recipient",
                    email: "recipient@example.com",
                },
            ],
            loading: false,
            error: null,
        })
    })

    it("exposes a delivery loading failure", () => {
        const [initial] = init()
        const [failed] = update(
            initial,
            SentDeliveriesFailed({ error: "Could not load deliveries" })
        )

        expect(failed).toMatchObject({
            loading: false,
            error: "Could not load deliveries",
        })
    })
})
