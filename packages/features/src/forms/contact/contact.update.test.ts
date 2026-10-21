import { describe, expect, it } from "vitest"
import {
    ChangedEmail,
    ChangedMessage,
    ChangedName,
    SubmittedContactForm,
} from "./contact.message.ts"
import { init, update } from "./contact.update.ts"

describe("contact form update", () => {
    it("shows validation errors when an empty form is submitted", () => {
        const [initial_model] = init()
        const [model, commands] = update(initial_model, SubmittedContactForm())

        expect(model.name._tag).toBe("Invalid")
        expect(model.email._tag).toBe("Invalid")
        expect(model.message._tag).toBe("Invalid")
        expect(model.ready_for_backend).toBe(false)
        expect(commands).toEqual([])
    })

    it("prepares valid data without issuing a network command", () => {
        const [initial_model] = init()
        const [with_name] = update(
            initial_model,
            ChangedName({ value: "Sarene" })
        )
        const [with_email] = update(
            with_name,
            ChangedEmail({ value: "sarene@example.com" })
        )
        const [with_message] = update(
            with_email,
            ChangedMessage({ value: "Please call me about catering." })
        )
        const [model, commands] = update(with_message, SubmittedContactForm())

        expect(model.name._tag).toBe("Valid")
        expect(model.email._tag).toBe("Valid")
        expect(model.message._tag).toBe("Valid")
        expect(model.ready_for_backend).toBe(true)
        expect(commands).toEqual([])
    })
})
