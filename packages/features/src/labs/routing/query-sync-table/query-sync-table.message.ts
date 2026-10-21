import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { QuerySyncTableRoute, SortColumn } from "./query-sync-table.route.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", {
    route: QuerySyncTableRoute,
})
export const CompletedReplaceUrl = taggedStruct("CompletedReplaceUrl")
export const ChangedSearchInput = taggedStruct("ChangedSearchInput", {
    value: S.String,
})
export const ClickedColumnHeader = taggedStruct("ClickedColumnHeader", {
    column: SortColumn,
})
export const SelectedDietFilter = taggedStruct("SelectedDietFilter", {
    value: S.String,
})
export const SelectedPeriodFilter = taggedStruct("SelectedPeriodFilter", {
    value: S.String,
})

export const Message = S.Union([
    ChangedRoute,
    CompletedReplaceUrl,
    ChangedSearchInput,
    ClickedColumnHeader,
    SelectedDietFilter,
    SelectedPeriodFilter,
])

export type Message = typeof Message.Type
