/\*\*

- # Tasks RPC Routes
-
- Effect RPC definitions for todo items.
- Note: Single global list per domain - no list management RPCs
- \*/

import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { Schema } from "effect";
import {
TodoListItem,
CreateTodoListItemInput,
UpdateTodoListItemInput,
NotFoundError,
DatabaseError,
ValidationError,
} from "./model.js";

// List all todo items for a user
export const TasksItemsListRpc = Rpc.make("items_list", {
payload: Schema.Struct({
user_id: Schema.String,
list_id: Schema.optional(Schema.String),
}),
success: Schema.Array(TodoListItem),
error: DatabaseError,
});

// Create a new todo item
export const TasksItemsCreateRpc = Rpc.make("items_create", {
payload: Schema.Struct({
data: CreateTodoListItemInput,
}),
success: Schema.Struct({
item: TodoListItem,
txid: Schema.Number,
}),
error: Schema.Union([DatabaseError, ValidationError]),
});

// Update a todo item
export const TasksItemsUpdateRpc = Rpc.make("items_update", {
payload: Schema.Struct({
id: Schema.String,
data: UpdateTodoListItemInput,
}),
success: Schema.Struct({
item: TodoListItem,
txid: Schema.Number,
}),
error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
});

// Delete a todo item
export const TasksItemsDeleteRpc = Rpc.make("items_delete", {
payload: Schema.Struct({
id: Schema.String,
}),
success: Schema.Struct({
txid: Schema.Number,
}),
error: Schema.Union([NotFoundError, DatabaseError]),
});

// Combined Tasks RPC Group
export const TasksRpcs = RpcGroup.make(
TasksItemsListRpc,
TasksItemsCreateRpc,
TasksItemsUpdateRpc,
TasksItemsDeleteRpc,
);
