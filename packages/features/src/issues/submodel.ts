import { Subscription } from "foldkit"
import { subscriptions as issueSubscriptions } from "./platform/app.subscription.ts"
import { AppMessage } from "./platform/app.message.ts"
import { Model } from "./platform/app.model.ts"

export { Model } from "./platform/app.model.ts"
export type { Model as ModelType } from "./platform/app.model.ts"
export {
    AppMessage as Message,
    CancelledIssueEditing,
    ConfirmedIssueDelete,
    GotDeleteIssueDialogMessage,
    GotDragAndDropMessage,
    IssueCreateFailed,
    IssueCreated,
    IssueDeleteFailed,
    IssueDeleted,
    IssueLoadFailed,
    IssueUpdateFailed,
    IssueUpdated,
    IssuesLoaded,
    RequestedIssueDelete,
    StartedIssueEditing,
    ToggledCreateIssue,
    ToggledCreateIssueDetails,
    ViewportChanged,
} from "./platform/app.message.ts"
export type { AppMessage as MessageType } from "./platform/app.message.ts"
export {
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
} from "./platform/route.message.ts"
export { init, update } from "./platform/app.update.ts"
export {
    routedSubmodelView,
    submodelView as view,
} from "./platform/app.view.ts"
export type { IssueViewHrefs } from "./platform/app.view.ts"
export { urlToAppRoute } from "./platform/route.ts"
export { COMPACT_VIEWPORT_QUERY } from "./platform/app.subscription.ts"
export { Issue, IssuePriority, IssueStatus } from "@urm/domain/schemas/issues"
export { Tag } from "@urm/domain/schemas/tags"
export { isAppScope } from "./platform/route.ts"

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: AppMessage) => ParentMessage
}) => {
    const {
        dragPointer,
        dragEscape,
        dragKeyboard,
        autoScroll,
        compactViewport,
    } = Subscription.lift(issueSubscriptions)<ParentModel, ParentMessage>(
        config
    )

    return {
        issuesDragPointer: dragPointer,
        issuesDragEscape: dragEscape,
        issuesDragKeyboard: dragKeyboard,
        issuesAutoScroll: autoScroll,
        issuesCompactViewport: compactViewport,
    }
}
