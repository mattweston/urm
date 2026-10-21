import { Schema as S } from "effect"
import { Email } from "./schemas/contacts.ts"
import type { RawRow } from "./schemas/data-tables.ts"

export const ContactName = S.Trimmed.check(S.isMinLength(1), S.isMaxLength(255))
export const ContactPhone = S.Trimmed.check(S.isMaxLength(50))
export const ContactTitle = S.Trimmed.check(S.isMaxLength(255))
export const ContactCompany = S.Trimmed.check(S.isMaxLength(255))
export const ImportedContact = S.Struct({
    name: ContactName,
    email: Email,
    tel: ContactPhone,
    title: ContactTitle,
    company: ContactCompany,
})
export type ImportedContact = typeof ImportedContact.Type
export const normalize_contact = (row: RawRow) => ({
    name: (row.name ?? "").trim(),
    email: (row.email ?? "").trim().toLowerCase(),
    tel: (row.tel ?? "").trim(),
    title: (row.title ?? "").trim(),
    company: (row.company ?? "").trim(),
})
export const contact_import_errors = (
    rows: ReadonlyArray<RawRow>
): ReadonlyArray<string> => {
    const errors: string[] = []
    const seen = new Set<string>()
    if (rows.length < 1 || rows.length > 200) errors.push("Choose 1–200 rows")
    if (JSON.stringify(rows).length > 100_000)
        errors.push("Import exceeds 100,000 characters")
    rows.forEach((row, index) => {
        const value = normalize_contact(row)
        const fields = [
            {
                key: "name",
                input: value.name,
                valid: S.is(ContactName)(value.name),
                reason: "required, maximum 255 characters",
            },
            {
                key: "email",
                input: value.email,
                valid: S.is(Email)(value.email),
                reason: "a valid email address is required",
            },
            {
                key: "tel",
                input: value.tel,
                valid: S.is(ContactPhone)(value.tel),
                reason: "maximum 50 characters",
            },
            {
                key: "title",
                input: value.title,
                valid: S.is(ContactTitle)(value.title),
                reason: "maximum 255 characters",
            },
            {
                key: "company",
                input: value.company,
                valid: S.is(ContactCompany)(value.company),
                reason: "maximum 255 characters",
            },
        ]
        for (const { key, input, valid, reason } of fields) {
            if (!valid)
                errors.push(
                    `Row ${index + 1}, ${key}: ${JSON.stringify(input.slice(0, 120))} — ${reason}`
                )
        }
        if (seen.has(value.email))
            errors.push(
                `Row ${index + 1}, email: duplicate address in this upload`
            )
        seen.add(value.email)
        for (const key of Object.keys(row))
            if (!Object.keys(value).includes(key))
                errors.push(`Row ${index + 1}: unknown field ${key}`)
    })
    return errors
}
