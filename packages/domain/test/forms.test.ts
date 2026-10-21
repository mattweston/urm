import { Schema as S } from "effect"
import { describe, expect, test } from "vitest"
import { FormDefinition, FormFieldDefinition } from "../src/schemas/forms.ts"

const link = {
    id: "privacy",
    kind: "link",
    name: "privacy",
    label: "Privacy policy",
    href: "https://example.com/privacy",
    description: "",
    placeholder: "",
    required: false,
    options: [],
}

describe("Form display links", () => {
    test("round trips URL snapshots separately from respondent URL inputs", () => {
        expect(
            S.decodeUnknownSync(FormDefinition)(
                JSON.parse(JSON.stringify([link]))
            )
        ).toEqual([link])
        const input = { ...link, kind: "url" }
        const decoded = S.decodeUnknownSync(FormFieldDefinition)(input)
        expect(decoded.kind).toBe("url")
        expect(decoded).not.toHaveProperty("href")
    })
    test.each([
        "",
        "javascript:alert(1)",
        "data:text/html,test",
        "/privacy",
        "https://user:password@example.com",
        " https://example.com",
    ])("rejects invalid saved destination %s", (href) => {
        expect(S.is(FormDefinition)([{ ...link, href }])).toBe(false)
    })
    test("allows unfinished editor fields but rejects missing labels and required links on save", () => {
        expect(S.is(FormFieldDefinition)({ ...link, href: "" })).toBe(true)
        expect(S.is(FormDefinition)([{ ...link, label: "" }])).toBe(false)
        expect(S.is(FormDefinition)([{ ...link, required: true }])).toBe(false)
    })
})
