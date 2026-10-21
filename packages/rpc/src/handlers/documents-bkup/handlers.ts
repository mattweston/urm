/**
 * # Documents RPC Handlers
 *
 * Effect RPC handlers for documents operations.
 * Uses generic repository for database operations.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { DocumentsRpcs } from "@urm/contracts/documents-legacy"
import { DocumentsRepository } from "@urm/contracts/repositories/documents"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { DocumentsRpcHandlersTag } from "./model.js"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/documents"

const DocumentsRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* DocumentsRepository

    return DocumentsRpcs.of({
        // List all documents
        list: () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch documents",
                                })
                        )
                    )
            }),

        // List blog documents
        "documents.list_blog_posts": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findManyByIdPrefix(activeDomain.domainId, "blog:urm:")
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch blog documents",
                                })
                        )
                    )
            }),

        // Get document by ID
        get: ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const result = yield* repo
                    .findById(activeDomain.domainId, id)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch document",
                                })
                        )
                    )

                if (!result) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Document with id ${id} not found`,
                        })
                    )
                }

                return result
            }),

        // Get document by slug
        "documents.get_by_slug": ({ slug }: { slug: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const result = yield* repo
                    .findBySlug(activeDomain.domainId, slug)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch document",
                                })
                        )
                    )

                if (!result) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Document with slug ${slug} not found`,
                        })
                    )
                }

                return result
            }),

        // Create a new document
        create: ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const result = yield* repo
                    .insert(activeDomain.domainId, data)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create document",
                                })
                        )
                    )

                return result
            }),

        // Update a document
        update: ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const result = yield* repo
                    .update(activeDomain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Document with id ${id} not found`,
                                })
                            }

                            return new DatabaseError({
                                message: "Failed to update document",
                            })
                        })
                    )

                return result
            }),

        // Delete (soft delete) a document
        delete: ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* repo.delete(activeDomain.domainId, id).pipe(
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Document with id ${id} not found`,
                            })
                        }

                        return new DatabaseError({
                            message: "Failed to delete document",
                        })
                    })
                )

                return { txid: 0 }
            }),
    })
})

export const DocumentsRpcLive = DocumentsRpcs.toLayer(DocumentsRpcHandlersLive)

export const DocumentsRpcHandlersTagLive = Layer.effect(
    DocumentsRpcHandlersTag,
    DocumentsRpcHandlersLive
)
