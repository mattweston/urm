import * as Schema from "effect/Schema"

/**
 * Contact email for write boundaries. Trim and lowercase before decoding;
 * validation rejects rather than normalizes input. The address pattern requires
 * non-whitespace parts around @ and a dot in the domain portion.
 */
export const Email = Schema.Trimmed.check(
    Schema.isLowercased(),
    Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
).pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

/**
 * Contact identifier brand for TypeScript. Branding adds no runtime format or
 * nonempty check to the underlying string.
 */
export const ContactId = Schema.String.pipe(Schema.brand("ContactId"))
export type ContactId = typeof ContactId.Type

/**
 * Contact telephone for write boundaries. Requires trimmed input but accepts
 * empty strings and punctuation; it does not require E.164 formatting.
 */
export const PhoneNumber = Schema.Trimmed.check(Schema.isMaxLength(50)).pipe(
    Schema.brand("PhoneNumber")
)
export type PhoneNumber = typeof PhoneNumber.Type

/**
 * Contact read model. Email and telephone remain optional plain strings
 * so existing records can load even when they fail the stricter Email or
 * PhoneNumber write-boundary checks.
 */
export const Contact = Schema.Struct({
    id: ContactId,
    name: Schema.String,
    email: Schema.optional(Schema.String),
    tel: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    company: Schema.optional(Schema.String),
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Contact = typeof Contact.Type

export const CreateContactInput = Schema.Struct({
    id: ContactId,
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    email: Schema.optional(Email),
    tel: Schema.optional(PhoneNumber),
    title: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    company: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    updated_at: Schema.Number,
})

export type CreateContactInput = Schema.Schema.Type<typeof CreateContactInput>

export const UpdateContactInput = Schema.Struct({
    id: ContactId,
    name: Schema.optional(
        Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255))
    ),
    email: Schema.optional(Email),
    tel: Schema.optional(PhoneNumber),
    title: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    company: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    updated_at: Schema.Number,
})

export type UpdateContactInput = Schema.Schema.Type<typeof UpdateContactInput>

export const UpdateDomainContactProfileInput = Schema.Struct({
    name: UpdateContactInput.fields.name,
    tel: UpdateContactInput.fields.tel,
    title: UpdateContactInput.fields.title,
    company: UpdateContactInput.fields.company,
    updated_at: UpdateContactInput.fields.updated_at,
})

export type UpdateDomainContactProfileInput = Schema.Schema.Type<
    typeof UpdateDomainContactProfileInput
>

export const CreateContactRequest = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    email: Schema.optional(Email),
    tel: Schema.optional(PhoneNumber),
    title: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    company: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(255))),
    updated_at: Schema.Number,
})

export type CreateContactRequest = Schema.Schema.Type<
    typeof CreateContactRequest
>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
