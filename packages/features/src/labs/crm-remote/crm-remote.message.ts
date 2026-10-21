import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { RemoteContactsPage } from "./crm-remote.domain.ts"
import { ActivityRecency, DatasetSize } from "./crm-remote.model.ts"
import { CrmRemoteRoute } from "./crm-remote.route.ts"

export const ChangedRemoteCrmRoute = taggedStruct("ChangedRemoteCrmRoute", {
    route: CrmRemoteRoute,
})
export const CompletedRemoteCrmUrlReplacement = taggedStruct(
    "CompletedRemoteCrmUrlReplacement"
)
export const CompletedRemoteCrmUrlPush = taggedStruct(
    "CompletedRemoteCrmUrlPush"
)
export const UpdatedRemoteCrmSearchText = taggedStruct(
    "UpdatedRemoteCrmSearchText",
    {
        value: S.String,
    }
)
export const ToggledRemoteCrmSearchDebounce = taggedStruct(
    "ToggledRemoteCrmSearchDebounce",
    { isEnabled: S.Boolean }
)
// Carries the text that armed the timer, so update can ask the only question
// that matters on receipt: is this still what the Model is waiting for?
export const ElapsedRemoteCrmSearchDebounce = taggedStruct(
    "ElapsedRemoteCrmSearchDebounce",
    { value: S.String }
)
export const SelectedRemoteCrmDatasetSize = taggedStruct(
    "SelectedRemoteCrmDatasetSize",
    {
        size: DatasetSize,
    }
)
export const ToggledRemoteCrmTagFacet = taggedStruct(
    "ToggledRemoteCrmTagFacet",
    {
        tagId: S.String,
        isSelected: S.Boolean,
    }
)
export const SelectedRemoteCrmActivityRecency = taggedStruct(
    "SelectedRemoteCrmActivityRecency",
    { activityRecency: ActivityRecency }
)
export const RequestedNextRemoteCrmPage = taggedStruct(
    "RequestedNextRemoteCrmPage"
)
export const RequestedPreviousRemoteCrmPage = taggedStruct(
    "RequestedPreviousRemoteCrmPage"
)
export const SettledRemoteContactsQuery = taggedStruct(
    "SettledRemoteContactsQuery",
    {
        queryKey: S.String,
        result: S.Result(RemoteContactsPage, S.String),
    }
)

export const Message = S.Union([
    ChangedRemoteCrmRoute,
    CompletedRemoteCrmUrlReplacement,
    CompletedRemoteCrmUrlPush,
    UpdatedRemoteCrmSearchText,
    ToggledRemoteCrmSearchDebounce,
    ElapsedRemoteCrmSearchDebounce,
    SelectedRemoteCrmDatasetSize,
    ToggledRemoteCrmTagFacet,
    SelectedRemoteCrmActivityRecency,
    RequestedNextRemoteCrmPage,
    RequestedPreviousRemoteCrmPage,
    SettledRemoteContactsQuery,
])
export type Message = typeof Message.Type
