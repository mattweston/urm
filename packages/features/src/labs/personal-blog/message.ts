import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import * as Counter from "./island/counter.ts"
import { BlogRoute } from "./route.ts"

export const ChangedBlogRoute = taggedStruct("ChangedBlogRoute", {
    route: BlogRoute,
})
export const GotCounterMessage = taggedStruct("GotCounterMessage", {
    message: Counter.Message,
})

export const PersonalBlogMessage = S.Union([
    ChangedBlogRoute,
    GotCounterMessage,
])
export type PersonalBlogMessage = typeof PersonalBlogMessage.Type
