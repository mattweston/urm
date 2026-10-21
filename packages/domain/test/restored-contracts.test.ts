import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { AuthAccountSession, AuthSession } from "../src/auth.ts"
import { CreateContactRequest } from "../src/schemas/contacts.ts"
import { CreateDocumentInput } from "../src/schemas/documents.ts"
import { CreatePreferenceInput } from "../src/schemas/settings.ts"

describe("restored contract compatibility", () => {
    it("requires an account for authenticated account sessions", () => {
        const contact = { id: "contact-1", name: "Ada" }
        expect(
            Schema.is(AuthAccountSession)({ authenticated: true, contact })
        ).toBe(false)
        expect(
            Schema.is(AuthAccountSession)({
                authenticated: true,
                account: { id: "account-1", contact_id: contact.id },
                contact,
            })
        ).toBe(true)
        expect(Schema.is(AuthAccountSession)({ authenticated: false })).toBe(
            true
        )
        expect(Schema.is(AuthSession)({ authenticated: true, contact })).toBe(
            true
        )
    })

    it("retains current contact write validation", () => {
        const contact = { name: "Ada", email: "ada@example.com", updated_at: 1 }
        expect(Schema.is(CreateContactRequest)(contact)).toBe(true)
        expect(
            Schema.is(CreateContactRequest)({
                ...contact,
                email: " Ada@example.com ",
            })
        ).toBe(false)
    })

    it("uses current document formats and write constraints", () => {
        const document = {
            id: "doc-1",
            title: "Document",
            content: "{}",
            content_type: "rich_text_json",
            published: false,
            created_at: 1,
            updated_at: 1,
        }
        expect(Schema.is(CreateDocumentInput)(document)).toBe(true)
        expect(
            Schema.is(CreateDocumentInput)({
                ...document,
                title: "a".repeat(501),
            })
        ).toBe(false)
        expect(
            Schema.is(CreateDocumentInput)({ ...document, slug: "Bad Slug" })
        ).toBe(false)
    })

    it("keeps themes added after the legacy contracts", () => {
        expect(
            Schema.is(CreatePreferenceInput)({
                id: "preference-1",
                contact_id: "contact-1",
                theme: "neo-brutalism",
                updated_at: 1,
            })
        ).toBe(true)
    })
})
