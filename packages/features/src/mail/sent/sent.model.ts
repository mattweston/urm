import { Schema as S } from "effect"
import { EmailDeliveryStatus } from "@urm/domain/schemas/email"

export const SentContact = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
})

export type SentContact = typeof SentContact.Type

export const SentDelivery = S.Struct({
    id: S.String,
    contactId: S.NullOr(S.String),
    subject: S.String,
    isTest: S.Boolean,
    status: EmailDeliveryStatus,
    providerStatus: S.NullOr(S.String),
    recipientDomain: S.NullOr(S.String),
    errorMessage: S.NullOr(S.String),
    createdAt: S.Number,
    sentAt: S.NullOr(S.Number),
})

export type SentDelivery = typeof SentDelivery.Type

export const Model = S.Struct({
    deliveries: S.Array(SentDelivery),
    contacts: S.Array(SentContact),
    loading: S.Boolean,
    error: S.NullOr(S.String),
})

export type Model = typeof Model.Type
