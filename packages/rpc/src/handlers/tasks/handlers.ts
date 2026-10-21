import { Effect, Layer } from "effect"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/tasks"
import {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import { TasksRpcs } from "@urm/contracts/tasks"
import { TodoListItemsRepository } from "@urm/contracts/repositories/tasks"
import { TasksRpcHandlersTag } from "./tag.ts"

const TasksRpcHandlersLive = Effect.gen(function* () {
    const itemsRepo = yield* TodoListItemsRepository

    return TasksRpcs.of({
        items_list: ({ listId }) =>
            Effect.gen(function* () {
                const active_domain = yield* ActiveDomainRequestContext
                return yield* itemsRepo
                    .findMany(
                        active_domain.domainId,
                        listId === undefined ? {} : { listId }
                    )
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch items",
                                })
                        )
                    )
            }),

        items_create: ({ data }) =>
            Effect.gen(function* () {
                const active_domain = yield* ActiveDomainRequestContext
                const authenticated = yield* AuthenticatedRequestContext
                return yield* itemsRepo
                    .insert(
                        active_domain.domainId,
                        authenticated.contactId,
                        data
                    )
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create item",
                                })
                        )
                    )
            }),

        items_update: ({ id, data }) =>
            Effect.gen(function* () {
                const active_domain = yield* ActiveDomainRequestContext
                return yield* itemsRepo
                    .update(active_domain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Todo item with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to update item",
                            })
                        })
                    )
            }),

        items_delete: ({ id }) =>
            Effect.gen(function* () {
                const active_domain = yield* ActiveDomainRequestContext
                return yield* itemsRepo.delete(active_domain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Todo item with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete item",
                        })
                    })
                )
            }),

        items_reorder_batch: ({ items }) =>
            Effect.gen(function* () {
                const active_domain = yield* ActiveDomainRequestContext
                return yield* itemsRepo
                    .reorderBatch(active_domain.domainId, items)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to reorder items",
                                })
                        )
                    )
            }),
    })
})

export { TodoListItemsRepositoryLive } from "./repository.ts"

export const TasksRpcLive = TasksRpcs.toLayer(TasksRpcHandlersLive)

export const TasksRpcHandlersTagLive = Layer.effect(
    TasksRpcHandlersTag,
    TasksRpcHandlersLive
)
