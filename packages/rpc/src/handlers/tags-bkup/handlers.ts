/**
 * # Tags RPC Handlers
 *
 * Effect RPC handlers for tag operations.
 * Uses repository pattern for database access with full validation.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { TagsRpcs } from "@urm/contracts/tags-legacy"
import {
    TagsRepository,
    EntityTagsRepository,
} from "@urm/contracts/repositories/tags"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { TagsRpcHandlersTag } from "./tag.js"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/tags"

const TagsRpcHandlersLive = Effect.gen(function* () {
    const tagsRepo = yield* TagsRepository
    const entityTagsRepo = yield* EntityTagsRepository

    return TagsRpcs.of({
        // List all tags
        "tags.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* tagsRepo
                    .findMany(activeDomain.domainId)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch tags",
                                })
                        )
                    )
            }),

        // Get tag by ID
        "tags.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* tagsRepo.findById(activeDomain.domainId, id).pipe(
                    Effect.andThen((result) => {
                        if (!result) {
                            return Effect.fail(
                                new NotFoundError({
                                    message: `Tag with id ${id} not found`,
                                })
                            )
                        }
                        return Effect.succeed(result)
                    }),
                    Effect.mapError((err) => {
                        if (err instanceof NotFoundError) return err
                        return new DatabaseError({
                            message: "Failed to fetch tag",
                        })
                    })
                )
            }),

        // Create a new tag
        "tags.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* tagsRepo
                    .insert(activeDomain.domainId, data)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create tag",
                                })
                        )
                    )
            }),

        // Update a tag
        "tags.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* tagsRepo
                    .update(activeDomain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Tag with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to update tag",
                            })
                        })
                    )
            }),

        // Delete (soft delete) a tag
        "tags.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* tagsRepo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Tag with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete tag",
                        })
                    })
                )
            }),

        // List entity tags
        "tags.entity_tags_list": ({ entity_type, entity_id }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* entityTagsRepo
                    .findMany(activeDomain.domainId, {
                        ...(entity_type === undefined ? {} : { entity_type }),
                        ...(entity_id === undefined ? {} : { entity_id }),
                    })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch entity-tags",
                                })
                        )
                    )
            }),

        // Create entity tag link
        "tags.entity_tags_create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* entityTagsRepo
                    .insert(activeDomain.domainId, data)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create entity-tag",
                                })
                        )
                    )
            }),

        // Delete entity tag link
        "tags.entity_tags_delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* entityTagsRepo
                    .delete(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen(() => Effect.succeed({ txid: 0 })),
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `EntityTag with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to delete entity-tag",
                            })
                        })
                    )
            }),

        // Set tags for entity
        "tags.entity_tags_set": ({ entity_type, entity_id, tag_ids }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* entityTagsRepo
                    .setTagsForEntity(
                        activeDomain.domainId,
                        entity_type,
                        entity_id,
                        [...tag_ids]
                    )
                    .pipe(
                        Effect.andThen(() => Effect.succeed({ txid: 0 })),
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to set tags for entity",
                                })
                        )
                    )
            }),
    })
})

export const TagsRpcLive = TagsRpcs.toLayer(TagsRpcHandlersLive)

export const TagsRpcHandlersTagLive = Layer.effect(
    TagsRpcHandlersTag,
    TagsRpcHandlersLive
)
