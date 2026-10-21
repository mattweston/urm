/**
 * # Media RPC Handlers
 *
 * Effect RPC handlers for media/images operations.
 * Uses repository pattern for database access with full validation.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { MediaRpcs } from "@urm/contracts/media-legacy"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { ImagesRepository } from "@urm/contracts/repositories/media"
import { MediaRpcHandlersTag } from "./tag.js"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/media"

const MediaRpcHandlersLive = Effect.gen(function* () {
    const imagesRepo = yield* ImagesRepository

    return MediaRpcs.of({
        // List all images (optionally filtered by timestamp)
        "images.list": ({ after }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* imagesRepo
                    .findMany(
                        activeDomain.domainId,
                        after === undefined ? {} : { after }
                    )
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch images",
                                })
                        )
                    )
            }),

        // Get image by ID
        "images.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* imagesRepo
                    .findById(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen((result) => {
                            if (!result) {
                                return Effect.fail(
                                    new NotFoundError({
                                        message: `Image with id ${id} not found`,
                                    })
                                )
                            }
                            return Effect.succeed(result)
                        }),
                        Effect.mapError((err) => {
                            if (err instanceof NotFoundError) return err
                            return new DatabaseError({
                                message: "Failed to fetch image",
                            })
                        })
                    )
            }),

        // Create a new image
        "images.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* imagesRepo
                    .insert(activeDomain.domainId, data)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create image",
                                })
                        )
                    )
            }),

        // Update an image
        "images.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* imagesRepo
                    .update(activeDomain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Image with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to update image",
                            })
                        })
                    )
            }),

        // Delete an image (hard delete)
        "images.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* imagesRepo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Image with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete image",
                        })
                    })
                )
            }),
    })
})

export const MediaRpcLive = MediaRpcs.toLayer(MediaRpcHandlersLive)

export const MediaRpcHandlersTagLive = Layer.effect(
    MediaRpcHandlersTag,
    MediaRpcHandlersLive
)
