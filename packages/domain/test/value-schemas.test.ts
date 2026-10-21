import { Effect } from "effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

import { Email } from "../src/schemas/contacts.ts"
import {
    decodeDocumentContent,
    DocumentContentType,
    DocumentSlug,
} from "../src/schemas/documents.ts"
import { DomainSlug, Hostname } from "../src/schemas/domains.ts"
import { EmailSubscriptionStatus } from "../src/schemas/email.ts"
import { RichTextDocument } from "../src/schemas/rich-text.ts"
import {
    AppFont,
    resolveTheme,
    Theme,
    themeFamilyFor,
} from "../src/schemas/settings.ts"

describe("shared value schemas", () => {
    it("accepts normalized email addresses", () => {
        expect(Schema.is(Email)("person@example.com")).toBe(true)
        expect(Schema.is(Email)(" Person@example.com ")).toBe(false)
    })

    it("keeps lifecycle and appearance values closed", () => {
        expect(Schema.is(EmailSubscriptionStatus)("suppressed")).toBe(true)
        expect(Schema.is(EmailSubscriptionStatus)("active")).toBe(false)
        expect(Schema.is(Theme)("dark")).toBe(true)
        expect(Schema.is(AppFont)("jetbrains-mono")).toBe(true)
    })

    it("resolves appearance families without duplicating theme mappings", () => {
        const family = themeFamilyFor("nord")

        expect(family.id).toBe("nord")
        expect(resolveTheme(family, "light")).toBe("nord-light")
    })

    it("validates the portable rich-text document shape", () => {
        expect(
            Schema.is(RichTextDocument)({
                type: "doc",
                children: [
                    {
                        type: "paragraph",
                        children: [{ type: "text", text: "Hello" }],
                    },
                ],
            })
        ).toBe(true)
    })

    it("shares document and website constraints", () => {
        expect(Schema.is(DocumentContentType)("rich_text_json")).toBe(true)
        expect(Schema.is(DocumentSlug)("about-us")).toBe(true)
        expect(Schema.is(DocumentSlug)("About Us")).toBe(false)
        expect(Schema.is(DomainSlug)("test-site")).toBe(true)
        expect(Schema.is(Hostname)("shop.example.com")).toBe(true)
        expect(Schema.is(Hostname)("not a hostname")).toBe(false)
    })

    it("decodes legacy rich text into the versioned content shape", async () => {
        const decoded = await Effect.runPromise(
            decodeDocumentContent({
                content_type: "rich_text_json",
                content: JSON.stringify({
                    document: {
                        type: "doc",
                        children: [],
                    },
                }),
            })
        )

        expect(decoded).toEqual({
            content_type: "rich_text_json",
            content: {
                schema_version: 1,
                document: {
                    type: "doc",
                    children: [],
                },
            },
        })
    })
})
