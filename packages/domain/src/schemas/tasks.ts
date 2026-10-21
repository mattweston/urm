import { Schema } from "effect"

export const TodoListItem = Schema.Struct({
    id: Schema.String,
    text: Schema.String,
    completed: Schema.Boolean,
    status: Schema.Literals(["active", "done", "deleted"]),
    priority: Schema.optional(
        Schema.NullOr(Schema.Literals(["low", "medium", "high"]))
    ),
    order: Schema.Number,
    listId: Schema.String,
    createdByContactId: Schema.optional(Schema.NullOr(Schema.String)),
    assigneeContactId: Schema.optional(Schema.NullOr(Schema.String)),
    relationshipType: Schema.optional(Schema.NullOr(Schema.String)),
    updatedAt: Schema.Number,
    createdAt: Schema.Number,
})
export type TodoListItem = typeof TodoListItem.Type

export const TodoList = Schema.Struct({
    id: Schema.String,
    slug: Schema.String,
    title: Schema.String,
    status: Schema.Literals(["backlog", "active", "done"]),
    order: Schema.Number,
    updatedAt: Schema.Number,
    createdAt: Schema.Number,
})
export type TodoList = typeof TodoList.Type

export const UpdateTodoListItemInput = Schema.Struct({
    text: Schema.optional(Schema.String),
    completed: Schema.optional(Schema.Boolean),
    status: Schema.optional(Schema.Literals(["active", "done", "deleted"])),
    listId: Schema.optional(Schema.String),
    priority: Schema.optional(
        Schema.NullOr(Schema.Literals(["low", "medium", "high"]))
    ),
    order: Schema.optional(Schema.Number),
    relationshipType: Schema.optional(Schema.NullOr(Schema.String)),
})
export type UpdateTodoListItemInput = typeof UpdateTodoListItemInput.Type

export const CreateTodoListItemInput = Schema.Struct({
    text: Schema.String,
    completed: Schema.optional(Schema.Boolean),
    status: Schema.optional(Schema.Literals(["active", "done", "deleted"])),
    listId: Schema.String,
    priority: Schema.optional(
        Schema.NullOr(Schema.Literals(["low", "medium", "high"]))
    ),
    order: Schema.Number,
    relationshipType: Schema.optional(Schema.NullOr(Schema.String)),
})

export type CreateTodoListItemInput = Schema.Schema.Type<
    typeof CreateTodoListItemInput
>

export { DatabaseError, NotFoundError, ValidationError } from "../errors.ts"
