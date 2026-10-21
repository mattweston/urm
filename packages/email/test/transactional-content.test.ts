import { describe, expect, test } from "vitest"
import { Schema } from "effect"
import {
    TransactionalCopy,
    TransactionalTemplateId,
    default_transactional_copy,
} from "../src/transactional-content.ts"
import {
    transactionalTemplateTestEmail,
    passwordResetEmail,
} from "../src/templates.ts"

describe("transactional copy", () => {
    test("renders editable copy as text, preserving protected security content", () => {
        for (const id of TransactionalTemplateId.literals) {
            const copy = {
                ...default_transactional_copy(id),
                subject: "New subject",
                heading: "New heading",
                introduction: "<script>unsafe</script>",
            }
            const email = transactionalTemplateTestEmail(
                id,
                "person@example.com",
                undefined,
                copy
            )
            expect(email.subject).toBe(copy.subject)
            expect(email.html).toContain("&lt;script&gt;unsafe&lt;/script&gt;")
            expect(email.html).not.toContain("<script>")
            expect(email.text).toContain(copy.introduction)
            expect(email.html).toContain("https://urm.dev/")
            expect(email.text).toContain(
                id === "auth_password_changed"
                    ? "contact support immediately"
                    : "you can ignore it"
            )
        }
        const email = passwordResetEmail({
            to: "person@example.com",
            reset_url: "https://example.com/reset?token=trusted",
            expires_minutes: 17,
            copy: default_transactional_copy("auth_password_reset"),
        })
        expect(email.text).toContain("17 minutes")
        expect(email.html).toContain("https://example.com/reset?token=trusted")
    })
    test("rejects empty, oversized and multiline subject copy", () => {
        const copy = default_transactional_copy("auth_password_reset")
        for (const subject of [
            "",
            " ",
            "x".repeat(201),
            "Subject\r\nBcc: person@example.com",
        ])
            expect(Schema.is(TransactionalCopy)({ ...copy, subject })).toBe(
                false
            )
        expect(
            Schema.is(TransactionalCopy)({
                ...copy,
                introduction: "x".repeat(2001),
            })
        ).toBe(false)
    })
})
