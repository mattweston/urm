import { Schema as S } from "effect"
import { EmailSubscription } from "@urm/domain/schemas/email"

export const SubscriptionContact = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
})

export type SubscriptionContact = typeof SubscriptionContact.Type

export const Model = S.Struct({
    listKey: S.String,
    activeListKey: S.String,
    subscriptions: S.Array(EmailSubscription),
    availableContacts: S.Array(SubscriptionContact),
    selectedContactId: S.String,
    loading: S.Boolean,
    savingContactId: S.NullOr(S.String),
    error: S.NullOr(S.String),
    notice: S.NullOr(S.String),
})

export type Model = typeof Model.Type
