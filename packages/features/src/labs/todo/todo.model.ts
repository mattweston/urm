import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

const Todo = S.Struct({
    id: S.String,
    text: S.String,
    completed: S.Boolean,
    createdAt: S.Number,
})
type Todo = typeof Todo.Type

const Todos = S.Array(Todo)
type Todos = typeof Todos.Type

const Filter = S.Literals(["All", "Active", "Completed"])
type Filter = typeof Filter.Type

export const NotEditing = taggedStruct("NotEditing")
type NotEditing = typeof NotEditing.Type

export const Editing = taggedStruct("Editing", {
    id: S.String,
    text: S.String,
})
type Editing = typeof Editing.Type

const EditingState = S.Union([NotEditing, Editing])
type EditingState = typeof EditingState.Type

export const Model = S.Struct({
    todos: Todos,
    newTodoText: S.String,
    filter: Filter,
    editing: EditingState,
})

export type Model = typeof Model.Type
