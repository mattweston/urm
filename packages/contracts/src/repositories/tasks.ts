/**
 * # Tasks Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import {
    CreateTodoListItemInput,
    TodoListItem,
    UpdateTodoListItemInput,
} from "@urm/domain/schemas/tasks"
import { DatabaseError } from "@urm/domain/errors"

export interface TodoListItemsRepositoryType {
    insert(
        domain_id: string,
        created_by_contact_id: string,
        data: Schema.Schema.Type<typeof CreateTodoListItemInput>
    ): Effect.Effect<ItemResult<TodoListItem>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateTodoListItemInput>>
    ): Effect.Effect<ItemResult<TodoListItem>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<TodoListItem | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            listId?: string
        }
    ): Effect.Effect<TodoListItem[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
    reorderBatch(
        domain_id: string,
        items: ReadonlyArray<{ id: string; order: number }>
    ): Effect.Effect<TodoListItem[], DatabaseError, never>
}

export class TodoListItemsRepository extends Context.Service<
    TodoListItemsRepository,
    TodoListItemsRepositoryType
>()("TodoListItemsRepository") {}
