/**
 * # Tasks RPC
 */
import { Effect, type Schema } from "effect"
import type {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import type {
    CreateTodoListItemInput,
    UpdateTodoListItemInput,
} from "@urm/domain/schemas/tasks"
import { TodoListItem } from "@urm/domain/schemas/tasks"
import type {
    NotFoundError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"

export type TodoListItemType = Schema.Schema.Type<typeof TodoListItem>

export {
    TasksRpcLive,
    TasksRpcHandlersTagLive,
    TodoListItemsRepositoryLive,
} from "./handlers.ts"
export { TodoListItemsRepository } from "@urm/contracts/repositories/tasks"

export type TasksRpcHandlers = {
    items_list: (params: {
        listId?: string
    }) => Effect.Effect<
        TodoListItemType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    items_create: (params: {
        data: CreateTodoListItemInput
    }) => Effect.Effect<
        { item: TodoListItemType; txid: number },
        DatabaseError | ValidationError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
    items_update: (params: {
        id: string
        data: UpdateTodoListItemInput
    }) => Effect.Effect<
        { item: TodoListItemType; txid: number },
        NotFoundError | DatabaseError | ValidationError,
        ActiveDomainRequestContext
    >
    items_delete: (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    items_reorder_batch: (params: {
        items: ReadonlyArray<{ id: string; order: number }>
    }) => Effect.Effect<
        TodoListItemType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
}

export { TasksRpcHandlersTag } from "./tag.ts"
