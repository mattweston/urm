import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { TourDateFilter } from "./filter.ts"
import { TourDateGroup } from "./tour-date.ts"

export const Viewing = taggedStruct("Viewing")
export const Editing = taggedStruct("Editing")
export const Loading = taggedStruct("Loading")
export const Ready = taggedStruct("Ready")
export const Saving = taggedStruct("Saving")
export const SaveFailed = taggedStruct("SaveFailed", { error: S.String })

export const Model = S.Struct({
    filter: TourDateFilter,
    groups: S.Array(TourDateGroup),
    saved_snapshot: S.Array(TourDateGroup),
    editor_state: S.Union([Viewing, Editing]),
    persistence_state: S.Union([Loading, Ready, Saving, SaveFailed]),
})
export type Model = typeof Model.Type
