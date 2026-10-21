import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import { ActivityRecency, DatasetSize } from "./crm-indexeddb.model.ts"

export const UpdatedIndexedDbCrmSearchText = taggedStruct(
    "UpdatedIndexedDbCrmSearchText",
    { value: S.String }
)
export const ToggledIndexedDbCrmSearchDebounce = taggedStruct(
    "ToggledIndexedDbCrmSearchDebounce",
    { isEnabled: S.Boolean }
)
export const ToggledIndexedDbCrmDenormalizedRead = taggedStruct(
    "ToggledIndexedDbCrmDenormalizedRead",
    { isEnabled: S.Boolean }
)
export const ToggledIndexedDbCrmTokenIndexSearch = taggedStruct(
    "ToggledIndexedDbCrmTokenIndexSearch",
    { isEnabled: S.Boolean }
)
// Carries the text that armed the timer, so update can ask on receipt whether
// this is still what the Model is waiting for.
export const ElapsedIndexedDbCrmSearchDebounce = taggedStruct(
    "ElapsedIndexedDbCrmSearchDebounce",
    { value: S.String }
)
export const SelectedIndexedDbCrmDatasetSize = taggedStruct(
    "SelectedIndexedDbCrmDatasetSize",
    { size: DatasetSize }
)
export const ToggledIndexedDbCrmTagFacet = taggedStruct(
    "ToggledIndexedDbCrmTagFacet",
    {
        tagId: S.String,
        isSelected: S.Boolean,
    }
)
export const SelectedIndexedDbCrmActivityRecency = taggedStruct(
    "SelectedIndexedDbCrmActivityRecency",
    { activityRecency: ActivityRecency }
)
export const ClickedIndexedDbCrmRebuild = taggedStruct(
    "ClickedIndexedDbCrmRebuild"
)
export const RequestedNextIndexedDbCrmPage = taggedStruct(
    "RequestedNextIndexedDbCrmPage"
)
export const RequestedPreviousIndexedDbCrmPage = taggedStruct(
    "RequestedPreviousIndexedDbCrmPage"
)
export const InspectedIndexedDbCrmDatabase = taggedStruct(
    "InspectedIndexedDbCrmDatabase",
    { seededContacts: S.Number, size: DatasetSize }
)
export const SeededIndexedDbCrmDatabaseBatch = taggedStruct(
    "SeededIndexedDbCrmDatabaseBatch",
    { seededContacts: S.Number, size: DatasetSize }
)
export const SettledIndexedDbContactsQuery = taggedStruct(
    "SettledIndexedDbContactsQuery",
    { queryKey: S.String, result: S.Result(RemoteContactsPage, S.String) }
)
export const FailedIndexedDbOperation = taggedStruct(
    "FailedIndexedDbOperation",
    {
        error: S.String,
    }
)

export const Message = S.Union([
    UpdatedIndexedDbCrmSearchText,
    ToggledIndexedDbCrmSearchDebounce,
    ElapsedIndexedDbCrmSearchDebounce,
    ToggledIndexedDbCrmDenormalizedRead,
    ToggledIndexedDbCrmTokenIndexSearch,
    SelectedIndexedDbCrmDatasetSize,
    ToggledIndexedDbCrmTagFacet,
    SelectedIndexedDbCrmActivityRecency,
    ClickedIndexedDbCrmRebuild,
    RequestedNextIndexedDbCrmPage,
    RequestedPreviousIndexedDbCrmPage,
    InspectedIndexedDbCrmDatabase,
    SeededIndexedDbCrmDatabaseBatch,
    SettledIndexedDbContactsQuery,
    FailedIndexedDbOperation,
])
export type Message = typeof Message.Type
