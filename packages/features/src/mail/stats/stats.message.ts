import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { StatsDelivery } from "./stats.model.ts"

export const MailStatsLoaded = taggedStruct("MailStatsLoaded", {
    deliveries: S.Array(StatsDelivery),
    observedAt: S.Number,
})

export const MailStatsFailed = taggedStruct("MailStatsFailed", {
    error: S.String,
})

export const Message = S.Union([MailStatsLoaded, MailStatsFailed])

export type Message = typeof Message.Type
