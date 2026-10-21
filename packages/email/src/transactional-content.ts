import { Schema } from "effect"

export const TransactionalTemplateId = Schema.Literals([
    "auth_email_verification",
    "auth_password_reset",
    "auth_password_changed",
])
export type TransactionalTemplateId = typeof TransactionalTemplateId.Type

const short_text = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(200),
    Schema.isPattern(/^[^\r\n]+$/)
)
export const TransactionalCopy = Schema.Struct({
    subject: short_text,
    heading: short_text,
    introduction: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(2000)
    ),
})
export type TransactionalCopy = typeof TransactionalCopy.Type

export const default_transactional_copy = (
    id: TransactionalTemplateId
): TransactionalCopy => {
    switch (id) {
        case "auth_email_verification":
            return {
                subject: "Confirm your email address",
                heading: "Confirm your email address",
                introduction: "Open this link to verify your email address:",
            }
        case "auth_password_reset":
            return {
                subject: "Reset your password",
                heading: "Reset your password",
                introduction: "Open this link to reset your password:",
            }
        case "auth_password_changed":
            return {
                subject: "Your password was changed",
                heading: "Your password was changed",
                introduction: "The password for your account was changed.",
            }
    }
}

export const TransactionalVersion = Schema.Struct({
    version: Schema.Number,
    copy: TransactionalCopy,
})
export const TransactionalHistoryEntry = Schema.Struct({
    ...TransactionalVersion.fields,
    created_at: Schema.Number,
    restored_from_version: Schema.NullOr(Schema.Number),
})
export const TransactionalHistoryPage = Schema.Struct({
    versions: Schema.Array(TransactionalHistoryEntry),
    next_before_version: Schema.NullOr(Schema.Number),
})
export const TransactionalTemplateState = Schema.Struct({
    template_id: TransactionalTemplateId,
    latest: Schema.NullOr(TransactionalVersion),
    active: Schema.NullOr(TransactionalVersion),
})
export type TransactionalTemplateState = typeof TransactionalTemplateState.Type
