import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { TourDateFilter } from "./filter.ts"
import { TourDateGroup } from "./tour-date.ts"

export const TourDateField = S.Literals([
    "title",
    "date",
    "day",
    "prices",
    "start_time",
    "ticket_link_url",
    "artist_page_url",
    "map_url",
    "address",
    "email",
    "phone",
    "note",
    "confirmation",
])
export type TourDateField = typeof TourDateField.Type

export const SelectedTourDateFilter = taggedStruct("SelectedTourDateFilter", {
    filter: TourDateFilter,
})
export const ClickedEditTourDates = taggedStruct("ClickedEditTourDates")
export const ClickedSaveTourDates = taggedStruct("ClickedSaveTourDates")
export const ClickedCancelTourDates = taggedStruct("ClickedCancelTourDates")
export const UpdatedTourDateGroupTitle = taggedStruct(
    "UpdatedTourDateGroupTitle",
    {
        group_id: S.String,
        value: S.String,
    }
)
export const UpdatedTourDateField = taggedStruct("UpdatedTourDateField", {
    group_id: S.String,
    tour_date_id: S.String,
    field: TourDateField,
    value: S.String,
})
export const LoadedTourDates = taggedStruct("LoadedTourDates", {
    maybe_groups: S.Option(S.Array(TourDateGroup)),
})
export const CompletedSaveTourDates = taggedStruct("CompletedSaveTourDates")
export const FailedSaveTourDates = taggedStruct("FailedSaveTourDates", {
    error: S.String,
})

export const Message = S.Union([
    SelectedTourDateFilter,
    ClickedEditTourDates,
    ClickedSaveTourDates,
    ClickedCancelTourDates,
    UpdatedTourDateGroupTitle,
    UpdatedTourDateField,
    LoadedTourDates,
    CompletedSaveTourDates,
    FailedSaveTourDates,
])
export type Message = typeof Message.Type
