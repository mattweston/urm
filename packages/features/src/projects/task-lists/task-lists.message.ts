import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { TodoList } from "@urm/domain/schemas/tasks"
import { TaskListStatus } from "./task-lists.model.ts"

export const LoadedTaskLists = taggedStruct("LoadedTaskLists", {
    lists: S.Array(TodoList),
})
export const FailedTaskLists = taggedStruct("FailedTaskLists", {
    error: S.String,
})
export const ClickedAddTaskList = taggedStruct("ClickedAddTaskList", {
    status: TaskListStatus,
})
export const ChangedNewTaskListTitle = taggedStruct("ChangedNewTaskListTitle", {
    value: S.String,
})
export const SubmittedNewTaskList = taggedStruct("SubmittedNewTaskList")
export const CancelledNewTaskList = taggedStruct("CancelledNewTaskList")
export const CreatedTaskList = taggedStruct("CreatedTaskList", {
    item: TodoList,
})
export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})
export const ReorderedTaskLists = taggedStruct("ReorderedTaskLists", {
    lists: S.Array(TodoList),
})
export const CompletedFocusTaskListInput = taggedStruct(
    "CompletedFocusTaskListInput"
)
export const ClickedDeleteTaskList = taggedStruct("ClickedDeleteTaskList", {
    id: S.String,
})
export const GotDeleteConfirmationDialogMessage = taggedStruct(
    "GotDeleteConfirmationDialogMessage",
    { message: Ui.Dialog.Message }
)
export const ConfirmedDeleteTaskList = taggedStruct("ConfirmedDeleteTaskList")
export const DeletedTaskList = taggedStruct("DeletedTaskList", {
    id: S.String,
    title: S.String,
})
export const MovedTaskListForward = taggedStruct("MovedTaskListForward", {
    id: S.String,
})

/** Messages emitted directly by task-list board interactions. */
export type ViewMessage =
    | typeof ClickedAddTaskList.Type
    | typeof ChangedNewTaskListTitle.Type
    | typeof SubmittedNewTaskList.Type
    | typeof CancelledNewTaskList.Type
    | typeof GotDragAndDropMessage.Type
    | typeof ClickedDeleteTaskList.Type
    | typeof GotDeleteConfirmationDialogMessage.Type
    | typeof ConfirmedDeleteTaskList.Type
    | typeof MovedTaskListForward.Type

export const Message = S.Union([
    LoadedTaskLists,
    FailedTaskLists,
    ClickedAddTaskList,
    ChangedNewTaskListTitle,
    SubmittedNewTaskList,
    CancelledNewTaskList,
    CreatedTaskList,
    GotDragAndDropMessage,
    ReorderedTaskLists,
    CompletedFocusTaskListInput,
    ClickedDeleteTaskList,
    GotDeleteConfirmationDialogMessage,
    ConfirmedDeleteTaskList,
    DeletedTaskList,
    MovedTaskListForward,
])
export type Message = typeof Message.Type
