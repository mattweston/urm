/**
 * # Tasks Service
 *
 * API interface implemented by web, native, or test layers
 */

import {
    CreateTodoListItemInput,
    TodoListItem,
} from "@urm/domain/schemas/tasks"

export interface TasksApi {
    itemsList(params: { listId?: string }): Promise<TodoListItem[]>

    itemsCreate(
        data: CreateTodoListItemInput
    ): Promise<{ item: TodoListItem; txid: number }>

    itemsUpdate(params: {
        id: string
        data: Partial<TodoListItem>
    }): Promise<{ item: TodoListItem; txid: number }>

    itemsDelete(params: { id: string }): Promise<{ txid: number }>
}
