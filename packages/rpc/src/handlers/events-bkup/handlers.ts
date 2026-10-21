/**
 * # Events RPC Handlers
 *
 * Effect RPC handlers for events and event menu items operations.
 * Uses repositories for database operations.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { EventsRpcs, EventMenuItemsRpcs } from "@urm/contracts/events"
import {
    EventsRepository,
    EventMenuItemsRepository,
} from "@urm/contracts/repositories/events"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { EventsRpcHandlersTag, EventMenuItemsRpcHandlersTag } from "./tag.js"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/events"

const EventsRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* EventsRepository

    return EventsRpcs.of({
        // List all events
        "events.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch events",
                                })
                        )
                    )
            }),

        // Get event by ID
        "events.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.findById(activeDomain.domainId, id).pipe(
                    Effect.andThen((result) => {
                        if (!result) {
                            return Effect.fail(
                                new NotFoundError({
                                    message: `Event with id ${id} not found`,
                                })
                            )
                        }
                        return Effect.succeed(result)
                    }),
                    Effect.mapError((err) => {
                        if (err instanceof NotFoundError) return err
                        return new DatabaseError({
                            message: "Failed to fetch event",
                        })
                    })
                )
            }),

        // Create a new event
        "events.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.insert(activeDomain.domainId, data).pipe(
                    Effect.mapError(
                        () =>
                            new DatabaseError({
                                message: "Failed to create event",
                            })
                    )
                )
            }),

        // Update an event
        "events.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.update(activeDomain.domainId, id, data).pipe(
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Event with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to update event",
                        })
                    })
                )
            }),

        // Delete (soft delete) an event
        "events.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Event with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete event",
                        })
                    })
                )
            }),
    })
})

const EventMenuItemsRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* EventMenuItemsRepository

    return EventMenuItemsRpcs.of({
        // List all event menu items
        "eventMenuItems.list": () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo
                    .findMany(activeDomain.domainId, { limit: 50 })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch event menu items",
                                })
                        )
                    )
            }),

        // Get event menu item by ID
        "eventMenuItems.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.findById(activeDomain.domainId, id).pipe(
                    Effect.andThen((result) => {
                        if (!result) {
                            return Effect.fail(
                                new NotFoundError({
                                    message: `Event menu item with id ${id} not found`,
                                })
                            )
                        }
                        return Effect.succeed(result)
                    }),
                    Effect.mapError((err) => {
                        if (err instanceof NotFoundError) return err
                        return new DatabaseError({
                            message: "Failed to fetch event menu item",
                        })
                    })
                )
            }),

        // Create a new event menu item
        "eventMenuItems.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.insert(activeDomain.domainId, data).pipe(
                    Effect.mapError(
                        () =>
                            new DatabaseError({
                                message: "Failed to create event menu item",
                            })
                    )
                )
            }),

        // Update an event menu item
        "eventMenuItems.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.update(activeDomain.domainId, id, data).pipe(
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Event menu item with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to update event menu item",
                        })
                    })
                )
            }),

        // Delete (soft delete) an event menu item
        "eventMenuItems.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* repo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `Event menu item with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete event menu item",
                        })
                    })
                )
            }),
    })
})

export const EventsRpcLive = EventsRpcs.toLayer(EventsRpcHandlersLive)
export const EventMenuItemsRpcLive = EventMenuItemsRpcs.toLayer(
    EventMenuItemsRpcHandlersLive
)

export const EventsRpcHandlersTagLive = Layer.effect(
    EventsRpcHandlersTag,
    EventsRpcHandlersLive
)
export const EventMenuItemsRpcHandlersTagLive = Layer.effect(
    EventMenuItemsRpcHandlersTag,
    EventMenuItemsRpcHandlersLive
)
