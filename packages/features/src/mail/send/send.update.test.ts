import { describe, expect, it } from "vitest"

import {
    SelectedSendModeChanged,
    SingleEmailSent,
    SubmittedSingleEmail,
    UpdatedSingleEmail,
} from "./send.message.ts"
import { init, reflectContacts, update } from "./send.update.ts"

const contact = {
    id: "contact-1",
    name: "Test Recipient",
    email: "recipient@example.com",
    email_addresses: [
        {
            id: "email-1",
            email: "recipient@example.com",
            is_primary: true,
        },
    ],
    tel: "",
    title: "",
    company: "",
    updatedAt: 1,
}

describe("transactional mail update", () => {
    it("selects the first contact and creates one send command", () => {
        const [empty] = init()
        const with_contact = reflectContacts(empty, [contact])
        const [with_subject] = update(
            with_contact,
            UpdatedSingleEmail({ field: "subject", value: " Test subject " })
        )
        const [ready] = update(
            with_subject,
            UpdatedSingleEmail({ field: "bodyText", value: " Test body " })
        )
        const [sending, commands] = update(ready, SubmittedSingleEmail())

        expect(sending.sending).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SendSingleEmail")
        expect(commands[0]?.args).toEqual({
            contactId: "contact-1",
            templateId: null,
            subject: "Test subject",
            bodyText: "Test body",
        })
    })

    it("sends a selected production template without editable content", () => {
        const [empty] = init()
        const with_contact = reflectContacts(empty, [contact])
        const [template_mode] = update(
            with_contact,
            SelectedSendModeChanged({ mode: "template" })
        )
        const [sending, commands] = update(
            template_mode,
            SubmittedSingleEmail()
        )

        expect(sending.sending).toBe(true)
        expect(commands[0]?.args).toEqual({
            contactId: "contact-1",
            templateId: "auth_email_verification",
            subject: null,
            bodyText: null,
        })
    })

    it("clears the message after a successful provider result", () => {
        const [empty] = init()
        const [sent] = update(
            { ...empty, subject: "Subject", bodyText: "Body", sending: true },
            SingleEmailSent({ status: "queued" })
        )

        expect(sent).toMatchObject({
            subject: "",
            bodyText: "",
            sending: false,
            notice: "Email queued.",
            error: null,
        })
    })
})
