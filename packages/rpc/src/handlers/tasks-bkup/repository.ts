/**
 * # Tasks Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for todo items operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { asc, and, eq, type SQL } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { todo_list_items } from "@urm/database/legacy-schema/tasks"
import {
    TodoListItem,
    CreateTodoListItemInput,
    UpdateTodoListItemInput,
} from "@urm/domain/schemas/tasks"
import {
    TodoListItemsRepository,
    type TodoListItemsRepositoryType,
} from "@urm/contracts/repositories/tasks"
import { repositoryError } from "../errors.ts"

export const TodoListItemsRepositoryLive = Layer.effect(
    TodoListItemsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: TodoListItemsRepositoryType = {
            insert: (domain_id, created_by_contact_id, data) =>
                Effect.gen(function* () {
                    const decodeTodoListItem =
                        Schema.decodeUnknownSync(TodoListItem)
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateTodoListItemInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const inserted = yield* db
                        .insert(todo_list_items)
                        .values({
                            id: crypto.randomUUID(),
                            domain_id,
                            text: validated.text,
                            completed: validated.completed,
                            status: validated.status ?? "active",
                            priority: validated.priority,
                            order: validated.order,
                            listId: validated.listId,
                            createdByContactId: created_by_contact_id,
                            relationshipType: validated.relationshipType,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert todo item")
                        )
                    }

                    return {
                        item: decodeTodoListItem(inserted[0]),
                        txid: 0,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id: string, id: string, data) =>
                Effect.gen(function* () {
                    const decodeTodoListItem =
                        Schema.decodeUnknownSync(TodoListItem)
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateTodoListItemInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const updated = yield* db
                        .update(todo_list_items)
                        .set({
                            text: validated.text,
                            completed: validated.completed,
                            status: validated.status,
                            priority: validated.priority,
                            order: validated.order,
                            listId: validated.listId,
                            relationshipType: validated.relationshipType,
                            updatedAt: Date.now(),
                        })
                        .where(
                            and(
                                eq(todo_list_items.id, id),
                                eq(todo_list_items.domain_id, domain_id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Todo item with ID ${id} not found`)
                        )
                    }

                    return {
                        item: decodeTodoListItem(updated[0]),
                        txid: 0,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(todo_list_items)
                        .where(
                            and(
                                eq(todo_list_items.id, id),
                                eq(todo_list_items.domain_id, domain_id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return Schema.decodeUnknownSync(TodoListItem)(results[0])
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id: string, { listId } = {}) =>
                Effect.gen(function* () {
                    const decodeTodoListItems = Schema.decodeUnknownSync(
                        Schema.Array(TodoListItem)
                    )
                    const filters: Array<SQL> = [
                        eq(todo_list_items.domain_id, domain_id),
                    ]

                    if (listId) {
                        filters.push(eq(todo_list_items.listId, listId))
                    }

                    const baseQuery = db
                        .select()
                        .from(todo_list_items)
                        .orderBy(asc(todo_list_items.order))

                    const results = yield* baseQuery
                        .where(and(...filters))
                        .pipe(Effect.mapError(repositoryError))

                    return [...decodeTodoListItems(results)]
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(todo_list_items)
                        .where(
                            and(
                                eq(todo_list_items.id, id),
                                eq(todo_list_items.domain_id, domain_id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Todo item with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),

            reorderBatch: (domain_id: string, items) =>
                Effect.gen(function* () {
                    const now = Date.now()

                    return yield* db.transaction((tx) =>
                        Effect.gen(function* () {
                            const updated: Array<TodoListItem> = []

                            for (const item of items) {
                                const result = yield* tx
                                    .update(todo_list_items)
                                    .set({ order: item.order, updatedAt: now })
                                    .where(
                                        and(
                                            eq(todo_list_items.id, item.id),
                                            eq(
                                                todo_list_items.domain_id,
                                                domain_id
                                            )
                                        )
                                    )
                                    .returning()
                                    .pipe(Effect.mapError(repositoryError))

                                if (result[0]) {
                                    updated.push(
                                        Schema.decodeUnknownSync(TodoListItem)(
                                            result[0]
                                        )
                                    )
                                }
                            }

                            return updated.sort((a, b) => a.order - b.order)
                        })
                    )
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
