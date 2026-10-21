import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { SentDelivery } from "./sent.model.ts"

export const SentDeliveriesLoaded = taggedStruct("SentDeliveriesLoaded", {
    deliveries: S.Array(SentDelivery),
})

export const SentDeliveriesFailed = taggedStruct("SentDeliveriesFailed", {
    error: S.String,
})

export const Message = S.Union([SentDeliveriesLoaded, SentDeliveriesFailed])

export type Message = typeof Message.Type
