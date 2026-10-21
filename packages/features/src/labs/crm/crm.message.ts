import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Dataset } from "./crm.domain.ts"
import { ActivityRecency, DatasetSize } from "./crm.model.ts"

export const GotVirtualListMessage = taggedStruct("GotVirtualListMessage", {
    message: Ui.VirtualList.Message,
})
export const UpdatedSearchText = taggedStruct("UpdatedSearchText", {
    value: S.String,
})
export const SelectedDatasetSize = taggedStruct("SelectedDatasetSize", {
    size: DatasetSize,
})
export const ToggledTagFacet = taggedStruct("ToggledTagFacet", {
    tagId: S.String,
    isSelected: S.Boolean,
})
export const SelectedActivityRecency = taggedStruct("SelectedActivityRecency", {
    activityRecency: ActivityRecency,
})
export const ClickedClearFilters = taggedStruct("ClickedClearFilters")
export const SelectedContact = taggedStruct("SelectedContact", {
    contactId: S.String,
})
export const CompletedGenerateDataset = taggedStruct(
    "CompletedGenerateDataset",
    {
        size: DatasetSize,
        dataset: Dataset,
    }
)

export const Message = S.Union([
    GotVirtualListMessage,
    UpdatedSearchText,
    SelectedDatasetSize,
    ToggledTagFacet,
    SelectedActivityRecency,
    ClickedClearFilters,
    SelectedContact,
    CompletedGenerateDataset,
])

export type Message = typeof Message.Type
