import { Schema as S } from "effect"
import {
    EmailDeliveryPurpose,
    EmailDeliveryStatus,
} from "@urm/domain/schemas/email"

export const StatsDelivery = S.Struct({
    id: S.String,
    purpose: EmailDeliveryPurpose,
    isTest: S.Boolean,
    status: EmailDeliveryStatus,
    createdAt: S.Number,
})

export type StatsDelivery = typeof StatsDelivery.Type

export const Model = S.Struct({
    deliveries: S.Array(StatsDelivery),
    observedAt: S.Number,
    loading: S.Boolean,
    error: S.NullOr(S.String),
})

export type Model = typeof Model.Type
