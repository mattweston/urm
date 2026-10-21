import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { SlowWarningReport } from "./model.ts"

export const ClickedRunUpdateWork = taggedStruct("ClickedRunUpdateWork")
export const ClickedRunViewWork = taggedStruct("ClickedRunViewWork")
export const ClickedRunPatchWork = taggedStruct("ClickedRunPatchWork")
export const ClickedRunSubscriptionDependenciesWork = taggedStruct(
    "ClickedRunSubscriptionDependenciesWork"
)
export const ClickedClearWarnings = taggedStruct("ClickedClearWarnings")
export const RecordedSlowWarning = taggedStruct("RecordedSlowWarning", {
    report: SlowWarningReport,
})

export const Message = S.Union([
    ClickedRunUpdateWork,
    ClickedRunViewWork,
    ClickedRunPatchWork,
    ClickedRunSubscriptionDependenciesWork,
    ClickedClearWarnings,
    RecordedSlowWarning,
])
export type Message = typeof Message.Type
