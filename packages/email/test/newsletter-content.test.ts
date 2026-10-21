import { describe, expect, it } from "@effect/vitest"

import {
    decodeEmailNewsletterBlockContent,
    decodeEmailNewsletterContent,
    emailNewsletterBlocksPlainText,
    emailNewsletterPlainText,
    encodeEmailNewsletterContent,
} from "../src/newsletter-content.ts"

describe("@urm/email - newsletter content", () => {
    it("adapts legacy plain text into rich-text paragraphs", () => {
        const document = decodeEmailNewsletterContent("First\nSecond")

        expect(document.children).toHaveLength(2)
        expect(emailNewsletterPlainText(document)).toBe("First\nSecond")
    })

    it("round-trips the versioned rich-text envelope", () => {
        const legacy = decodeEmailNewsletterContent("Hello")
        const stored = encodeEmailNewsletterContent(legacy)
        const decoded = decodeEmailNewsletterContent(stored)

        expect(JSON.parse(stored)).toMatchObject({ schema_version: 2 })
        expect(decoded).toEqual(legacy)
    })

    it("adapts the v1 rich-text envelope into one ordered body block", () => {
        const decoded = decodeEmailNewsletterBlockContent(
            '{"schema_version":1,"document":{"type":"doc","children":[{"type":"paragraph","children":[{"type":"text","text":"Legacy body"}]}]}}'
        )

        expect(decoded.schema_version).toBe(2)
        expect(decoded.blocks).toHaveLength(1)
        expect(emailNewsletterBlocksPlainText(decoded)).toBe("Legacy body")
    })
})
