import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { RoutingRoute } from "./routing.route.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", {
    route: RoutingRoute,
})
export const ChangedSearchInput = taggedStruct("ChangedSearchInput", {
    value: S.String,
})
export const CompletedReplaceSearchUrl = taggedStruct(
    "CompletedReplaceSearchUrl"
)

export const Message = S.Union([
    ChangedRoute,
    ChangedSearchInput,
    CompletedReplaceSearchUrl,
])

export type Message = typeof Message.Type
