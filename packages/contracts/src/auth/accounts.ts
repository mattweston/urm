import { Schema } from "effect"

export const AccountProfile = Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    display_name: Schema.String,
    image_url: Schema.NullOr(Schema.String),
})
export type AccountProfile = typeof AccountProfile.Type
export const AccountSession = Schema.Struct({
    account_id: Schema.String,
    contact_id: Schema.NullOr(Schema.String),
    session_id: Schema.String,
    profile: AccountProfile,
})
export type AccountSession = typeof AccountSession.Type

/** A domain visible to the signed-in account, with its organization and access. */
export const AccountDomain = Schema.Struct({
    id: Schema.String,
    slug: Schema.String,
    name: Schema.String,
    organization_name: Schema.String,
    can_write: Schema.Boolean,
})
export type AccountDomain = typeof AccountDomain.Type
/** The account's accessible domains; each id is a domains table id. */
export const AccountDomains = Schema.Struct({
    account_id: Schema.String,
    domains: Schema.Array(AccountDomain),
})
export type AccountDomains = typeof AccountDomains.Type
