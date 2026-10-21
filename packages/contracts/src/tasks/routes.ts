/**
 * # Tasks Routes
 */

import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import { Schema } from "effect"
import {
    TodoListItem,
    CreateTodoListItemInput,
    UpdateTodoListItemInput,
    NotFoundError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/schemas/tasks"

export const TasksItemsListRpc = Rpc.make("items_list", {
    payload: Schema.Struct({
        listId: Schema.optional(Schema.String),
    }),
    success: Schema.Array(TodoListItem),
    error: DatabaseError,
})

export const TasksItemsCreateRpc = Rpc.make("items_create", {
    payload: Schema.Struct({
        data: CreateTodoListItemInput,
    }),
    success: Schema.Struct({
        item: TodoListItem,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ValidationError]),
})

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
})

export const TasksItemsDeleteRpc = Rpc.make("items_delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const TasksItemsReorderBatchRpc = Rpc.make("items_reorder_batch", {
    payload: Schema.Struct({
        items: Schema.Array(
            Schema.Struct({
                id: Schema.String,
                order: Schema.Number,
            })
        ),
        listId: Schema.optional(Schema.String),
    }),
    success: Schema.Array(TodoListItem),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const TasksRpcs = RpcGroup.make(
    TasksItemsListRpc,
    TasksItemsCreateRpc,
    TasksItemsUpdateRpc,
    TasksItemsDeleteRpc,
    TasksItemsReorderBatchRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
