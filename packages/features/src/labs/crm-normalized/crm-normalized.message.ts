import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import {
    ActivityRecency,
    DatasetSize,
    FilterPreset,
} from "./crm-normalized.model.ts"

export const UpdatedNormalizedCrmSearchText = taggedStruct(
    "UpdatedNormalizedCrmSearchText",
    { value: S.String }
)
export const SelectedNormalizedCrmDatasetSize = taggedStruct(
    "SelectedNormalizedCrmDatasetSize",
    { size: DatasetSize }
)
export const ToggledNormalizedCrmTagFacet = taggedStruct(
    "ToggledNormalizedCrmTagFacet",
    {
        tagId: S.String,
        isSelected: S.Boolean,
    }
)
export const SelectedNormalizedCrmActivityRecency = taggedStruct(
    "SelectedNormalizedCrmActivityRecency",
    { activityRecency: ActivityRecency }
)
export const SelectedNormalizedCrmFilterPreset = taggedStruct(
    "SelectedNormalizedCrmFilterPreset",
    { preset: FilterPreset }
)
export const RequestedNextNormalizedCrmPage = taggedStruct(
    "RequestedNextNormalizedCrmPage"
)
export const RequestedPreviousNormalizedCrmPage = taggedStruct(
    "RequestedPreviousNormalizedCrmPage"
)
export const ClickedEditNormalizedCrmContact = taggedStruct(
    "ClickedEditNormalizedCrmContact",
    { contactId: S.String }
)
export const UpdatedNormalizedCrmEditedName = taggedStruct(
    "UpdatedNormalizedCrmEditedName",
    { value: S.String }
)
export const SubmittedNormalizedCrmContactEdit = taggedStruct(
    "SubmittedNormalizedCrmContactEdit"
)
export const ClickedCancelNormalizedCrmContactEdit = taggedStruct(
    "ClickedCancelNormalizedCrmContactEdit"
)
export const ToggledNormalizedCrmContactTag = taggedStruct(
    "ToggledNormalizedCrmContactTag",
    {
        contactId: S.String,
        tagId: S.String,
    }
)
export const SettledNormalizedContactsQuery = taggedStruct(
    "SettledNormalizedContactsQuery",
    {
        queryKey: S.String,
        result: S.Result(RemoteContactsPage, S.String),
    }
)

export const Message = S.Union([
    UpdatedNormalizedCrmSearchText,
    SelectedNormalizedCrmDatasetSize,
    ToggledNormalizedCrmTagFacet,
    SelectedNormalizedCrmActivityRecency,
    SelectedNormalizedCrmFilterPreset,
    RequestedNextNormalizedCrmPage,
    RequestedPreviousNormalizedCrmPage,
    ClickedEditNormalizedCrmContact,
    UpdatedNormalizedCrmEditedName,
    SubmittedNormalizedCrmContactEdit,
    ClickedCancelNormalizedCrmContactEdit,
    ToggledNormalizedCrmContactTag,
    SettledNormalizedContactsQuery,
])

export type Message = typeof Message.Type
