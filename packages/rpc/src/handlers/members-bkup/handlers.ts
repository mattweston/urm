/**
 * # Members RPC Handlers
 *
 * Effect RPC handlers for member operations.
 * Uses repository pattern for database access with full validation.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { MembersRpcs } from "@urm/contracts/members-old"
import { MembersRepository } from "@urm/contracts/repositories/members"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { MembersRpcHandlersTag } from "./tag.ts"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/members"

const MembersRpcHandlersLive = Effect.gen(function* () {
    const membersRepo = yield* MembersRepository

    return MembersRpcs.of({
        // List all members
        "members.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* membersRepo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch members",
                                })
                        )
                    )
            }),

        // Get member by ID
        "members.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* membersRepo
                    .findById(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen((result) => {
                            if (!result) {
                                return Effect.fail(
                                    new NotFoundError({
                                        message: `Member with id ${id} not found`,
                                    })
                                )
                            }
                            return Effect.succeed(result)
                        }),
                        Effect.mapError((err) => {
                            if (err instanceof NotFoundError) return err
                            return new DatabaseError({
                                message: "Failed to fetch member",
                            })
                        })
                    )
            }),

        // Create a new member
        "members.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* membersRepo
                    .insert(activeDomain.domainId, {
                        ...data,
                        id: crypto.randomUUID(),
                        updated_at: Date.now(),
                    })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create member",
                                })
                        )
                    )
            }),

        // Update a member
        "members.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* membersRepo
                    .update(activeDomain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Member with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to update member",
                            })
                        })
                    )
            }),

        // Delete a member (hard delete)
        "members.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* membersRepo
                    .delete(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen(() => Effect.succeed({ txid: 0 })),
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `Member with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to delete member",
                            })
                        })
                    )
            }),
    })
})

export const MembersRpcLive = MembersRpcs.toLayer(MembersRpcHandlersLive)

export const MembersRpcHandlersTagLive = Layer.effect(
    MembersRpcHandlersTag,
    MembersRpcHandlersLive
)
