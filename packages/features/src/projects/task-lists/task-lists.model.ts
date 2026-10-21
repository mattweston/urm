import { Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { TodoList } from "@urm/domain/schemas/tasks"

export const TaskListStatus = S.Literals(["backlog", "active", "done"])
export type TaskListStatus = typeof TaskListStatus.Type

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    lists: S.Array(TodoList),
    loaded: S.Boolean,
    error: S.String,
    dragAndDrop: Ui.DragAndDrop.Model,
    maybeNewListStatus: S.Option(TaskListStatus),
    newListTitle: S.String,
    announcement: S.String,
    pendingDeleteListId: S.NullOr(S.String),
    deletingListId: S.NullOr(S.String),
    deleteConfirmationDialog: Ui.Dialog.Model,
})
export type Model = typeof Model.Type

export const emptyModel = (): Model => ({
    lists: [],
    loaded: false,
    error: "",
    dragAndDrop: Ui.DragAndDrop.init({ id: "task-lists-kanban" }),
    maybeNewListStatus: Option.none(),
    newListTitle: "",
    announcement: "",
    pendingDeleteListId: null,
    deletingListId: null,
    deleteConfirmationDialog: Ui.Dialog.init({ id: "delete-project" }),
})
