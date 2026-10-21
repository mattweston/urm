import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import * as Ui from "@foldkit/ui"
import { Issue, IssuePriority, IssueStatus } from "@urm/domain/schemas/issues"
import { Tag } from "@urm/domain/schemas/tags"
import {
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
} from "./route.message.ts"

export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})
export const MoveIssueForward = taggedStruct("MoveIssueForward", {
    issueId: S.String,
})

export const ViewportChanged = taggedStruct("ViewportChanged", {
    isCompact: S.Boolean,
})

export const ViewSelected = taggedStruct("ViewSelected", {
    view: S.Literals(["board", "list"]),
})

export const SearchQueryChanged = taggedStruct("SearchQueryChanged", {
    value: S.String,
})
export const StatusFilterChanged = taggedStruct("StatusFilterChanged", {
    value: S.Literals([
        "all",
        "open",
        "in_progress",
        "closed",
        "on_hold",
        "archived",
    ]),
})
export const PriorityFilterChanged = taggedStruct("PriorityFilterChanged", {
    value: S.Literals(["all", "low", "medium", "high", "urgent"]),
})

export const NewTitleChanged = taggedStruct("NewTitleChanged", {
    value: S.String,
})
export const NewDescriptionChanged = taggedStruct("NewDescriptionChanged", {
    value: S.String,
})
export const NewContentChanged = taggedStruct("NewContentChanged", {
    value: S.String,
})
export const NewLabelsChanged = taggedStruct("NewLabelsChanged", {
    value: S.String,
})
export const NewAssigneeChanged = taggedStruct("NewAssigneeChanged", {
    value: S.String,
})
export const NewStatusChanged = taggedStruct("NewStatusChanged", {
    value: IssueStatus,
})
export const NewPriorityChanged = taggedStruct("NewPriorityChanged", {
    value: IssuePriority,
})
export const ToggledCreateIssue = taggedStruct("ToggledCreateIssue")
export const ToggledCreateIssueDetails = taggedStruct(
    "ToggledCreateIssueDetails"
)

export const StartedIssueEditing = taggedStruct("StartedIssueEditing")
export const CancelledIssueEditing = taggedStruct("CancelledIssueEditing")
export const EditingTitleChanged = taggedStruct("EditingTitleChanged", {
    value: S.String,
})
export const EditingDescriptionChanged = taggedStruct(
    "EditingDescriptionChanged",
    {
        value: S.String,
    }
)
export const EditingContentChanged = taggedStruct("EditingContentChanged", {
    value: S.String,
})
export const EditingLabelsChanged = taggedStruct("EditingLabelsChanged", {
    value: S.String,
})
export const EditingStatusChanged = taggedStruct("EditingStatusChanged", {
    value: IssueStatus,
})
export const EditingPriorityChanged = taggedStruct("EditingPriorityChanged", {
    value: IssuePriority,
})
export const EditingAssigneeChanged = taggedStruct("EditingAssigneeChanged", {
    value: S.String,
})

export const CreatedIssueSubmitted = taggedStruct("CreatedIssueSubmitted")
export const SavedIssueSubmitted = taggedStruct("SavedIssueSubmitted")
export const RequestedIssueDelete = taggedStruct("RequestedIssueDelete", {
    issueId: S.String,
})
export const GotDeleteIssueDialogMessage = taggedStruct(
    "GotDeleteIssueDialogMessage",
    {
        message: Ui.Dialog.Message,
    }
)
export const ConfirmedIssueDelete = taggedStruct("ConfirmedIssueDelete")

export const IssuesLoaded = taggedStruct("IssuesLoaded", {
    issues: S.Array(Issue),
    tags: S.optional(S.Array(Tag)),
})
export const IssueLoadFailed = taggedStruct("IssueLoadFailed", {
    error: S.String,
})
export const IssueCreated = taggedStruct("IssueCreated", { issue: Issue })
export const IssueCreateFailed = taggedStruct("IssueCreateFailed", {
    error: S.String,
})
export const IssueUpdated = taggedStruct("IssueUpdated", { issue: Issue })
export const IssueUpdateFailed = taggedStruct("IssueUpdateFailed", {
    error: S.String,
})
export const IssueDeleted = taggedStruct("IssueDeleted", {
    issueId: S.String,
    title: S.String,
})
export const IssueDeleteFailed = taggedStruct("IssueDeleteFailed", {
    error: S.String,
})

export const AppMessage = S.Union([
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
    GotDragAndDropMessage,
    MoveIssueForward,
    ViewSelected,
    ViewportChanged,
    SearchQueryChanged,
    StatusFilterChanged,
    PriorityFilterChanged,
    NewTitleChanged,
    NewDescriptionChanged,
    NewContentChanged,
    NewLabelsChanged,
    NewAssigneeChanged,
    NewStatusChanged,
    NewPriorityChanged,
    ToggledCreateIssue,
    ToggledCreateIssueDetails,
    StartedIssueEditing,
    CancelledIssueEditing,
    EditingTitleChanged,
    EditingDescriptionChanged,
    EditingContentChanged,
    EditingLabelsChanged,
    EditingStatusChanged,
    EditingPriorityChanged,
    EditingAssigneeChanged,
    CreatedIssueSubmitted,
    SavedIssueSubmitted,
    RequestedIssueDelete,
    GotDeleteIssueDialogMessage,
    ConfirmedIssueDelete,
    IssuesLoaded,
    IssueLoadFailed,
    IssueCreated,
    IssueCreateFailed,
    IssueUpdated,
    IssueUpdateFailed,
    IssueDeleted,
    IssueDeleteFailed,
])

export type AppMessage = typeof AppMessage.Type
export type Message = AppMessage
