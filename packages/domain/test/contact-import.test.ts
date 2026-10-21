import { expect, test } from "vitest"
import { data_templates, suggest_header } from "../src/data-templates.ts"
import { validate_columns } from "../src/schemas/data-tables.ts"
import {
    contact_import_errors,
    normalize_contact,
} from "../src/contact-import.ts"

test("templates validate and header suggestions refuse ambiguous aliases", () => {
    for (const template of data_templates) validate_columns(template.columns)
    const email = data_templates[0]?.columns.find(
        (column) => column.key === "email"
    )
    if (!email) throw new Error("Missing contact email column")
    expect(suggest_header(email, [" Email_Address "])).toBe(" Email_Address ")
    expect(suggest_header(email, ["Email", "Email Address"])).toBe("")
})
test("contact validation preserves literal text and reports missing, long and duplicate values", () => {
    expect(
        normalize_contact({ name: " =literal ", email: " A@EXAMPLE.COM " })
    ).toMatchObject({ name: "=literal", email: "a@example.com" })
    expect(contact_import_errors([{ name: "Alice" }]).join()).toContain("email")
    expect(
        contact_import_errors([
            { name: "Alice", email: "a@example.com", tel: "1".repeat(51) },
        ]).join()
    ).toContain("tel")
    expect(
        contact_import_errors([
            { name: "Alice", email: "a@example.com" },
            { name: "Bob", email: "A@example.com" },
        ]).join()
    ).toContain("Row 2, email: duplicate")
})
