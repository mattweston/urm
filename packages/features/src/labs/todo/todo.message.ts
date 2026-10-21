import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

const Filter = S.Literals(["All", "Active", "Completed"])

export const UpdatedNewTodo = taggedStruct("UpdatedNewTodo", { text: S.String })
export const UpdatedEditingTodo = taggedStruct("UpdatedEditingTodo", {
    text: S.String,
})
export const AddedTodo = taggedStruct("AddedTodo")
export const GeneratedTodo = taggedStruct("GeneratedTodo", {
    id: S.String,
    timestamp: S.Number,
    text: S.String,
})
export const DeletedTodo = taggedStruct("DeletedTodo", { id: S.String })
export const ToggledTodo = taggedStruct("ToggledTodo", { id: S.String })
export const StartedEditing = taggedStruct("StartedEditing", { id: S.String })
export const SavedEdit = taggedStruct("SavedEdit")
export const CancelledEdit = taggedStruct("CancelledEdit")
export const ToggledAll = taggedStruct("ToggledAll")
export const ClearedCompleted = taggedStruct("ClearedCompleted")
export const SelectedFilter = taggedStruct("SelectedFilter", { filter: Filter })
export const SavedTodos = taggedStruct("SavedTodos", {
    todos: S.Array(
        S.Struct({
            id: S.String,
            text: S.String,
            completed: S.Boolean,
            createdAt: S.Number,
        })
    ),
})

export const Message = S.Union([
    UpdatedNewTodo,
    UpdatedEditingTodo,
    AddedTodo,
    GeneratedTodo,
    DeletedTodo,
    ToggledTodo,
    StartedEditing,
    SavedEdit,
    CancelledEdit,
    ToggledAll,
    ClearedCompleted,
    SelectedFilter,
    SavedTodos,
])

export type Message = typeof Message.Type
