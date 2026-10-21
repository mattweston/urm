import { Schema } from "effect"

export const AccountId = Schema.String.pipe(Schema.brand("AccountId"))
export type AccountId = typeof AccountId.Type

export const AccountCategory = Schema.Literals([
    "asset",
    "liability",
    "equity",
    "income",
    "expense",
])
export type AccountCategory = typeof AccountCategory.Type

export const AccountCode = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(32)
).pipe(Schema.brand("AccountCode"))
export type AccountCode = typeof AccountCode.Type

export const AccountName = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
).pipe(Schema.brand("AccountName"))
export type AccountName = typeof AccountName.Type

export const Account = Schema.Struct({
    id: AccountId,
    code: Schema.String,
    name: Schema.String,
    category: AccountCategory,
    description: Schema.optionalKey(Schema.String),
    created_at: Schema.Number,
    updated_at: Schema.Number,
    archived_at: Schema.optionalKey(Schema.Number),
})
export type Account = typeof Account.Type

export const CreateAccountInput = Schema.Struct({
    code: AccountCode,
    name: AccountName,
    category: AccountCategory,
    description: Schema.optionalKey(
        Schema.Trimmed.check(Schema.isMaxLength(2000))
    ),
})
export type CreateAccountInput = typeof CreateAccountInput.Type

/** Replaces editable metadata; omit description to clear it. */
export const UpdateAccountInput = Schema.Struct({
    id: AccountId,
    ...CreateAccountInput.fields,
})
export type UpdateAccountInput = typeof UpdateAccountInput.Type

export const SetAccountArchivedInput = Schema.Struct({
    id: AccountId,
    archived: Schema.Boolean,
})
export type SetAccountArchivedInput = typeof SetAccountArchivedInput.Type
