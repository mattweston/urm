import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { Issue, IssuePriority, IssueStatus } from "@urm/domain/schemas/issues"
import { Tag } from "@urm/domain/schemas/tags"
import { AppRoute } from "./route.ts"

const IssueView = S.Literals(["board", "list"])
const StatusFilter = S.Literals([
    "all",
    "open",
    "in_progress",
    "closed",
    "on_hold",
    "archived",
])
const PriorityFilter = S.Literals(["all", "low", "medium", "high", "urgent"])
const IssueDetailMode = S.Literals(["preview", "editing"])

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    route: AppRoute,
    issues: S.Array(Issue),
    availableTags: S.Array(Tag),
    usesTagRelations: S.Boolean,
    issuesLoaded: S.Boolean,
    // Why a read failed. `issuesLoaded` says whether an answer arrived,
    // which a failure also satisfies, so the two are separate facts.
    error: S.NullOr(S.String),
    dragAndDrop: Ui.DragAndDrop.Model,
    announcement: S.String,
    view: IssueView,
    // Tracked so the board can stand down on narrow screens: four columns
    // with a 230px minimum cannot lay out on a phone.
    isCompactViewport: S.Boolean,
    searchQuery: S.String,
    statusFilter: StatusFilter,
    priorityFilter: PriorityFilter,
    newTitle: S.String,
    newDescription: S.String,
    newContent: S.String,
    newLabels: S.String,
    newAssignee: S.String,
    newStatus: IssueStatus,
    newPriority: IssuePriority,
    create_issue_expanded: S.Boolean,
    create_issue_details_expanded: S.Boolean,
    issue_detail_mode: IssueDetailMode,
    editingTitle: S.String,
    editingDescription: S.String,
    editingContent: S.String,
    editingLabels: S.String,
    editingStatus: IssueStatus,
    editingPriority: IssuePriority,
    editingAssignee: S.String,
    pending_delete_issue_id: S.Option(S.String),
    delete_issue_dialog: Ui.Dialog.Model,
})

export type Model = typeof Model.Type
export type IssueView = typeof IssueView.Type
export type StatusFilter = typeof StatusFilter.Type
export type PriorityFilter = typeof PriorityFilter.Type
export type IssueDetailMode = typeof IssueDetailMode.Type
