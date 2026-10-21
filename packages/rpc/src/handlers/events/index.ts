/**
 * # Events RPC
 */

import { Effect, type Schema } from "effect"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    Event,
    EventMenuItem,
    CreateEventInput,
    UpdateEventInput,
    CreateEventMenuItemInput,
    UpdateEventMenuItemInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/events"
import { ValidationError } from "@urm/domain/errors"

// Extract types from Effect schemas
export type EventType = Schema.Schema.Type<typeof Event>
export type EventMenuItemType = Schema.Schema.Type<typeof EventMenuItem>

export {
    EventsRpcs,
    EventsListRpc,
    EventsGetRpc,
    EventsCreateRpc,
    EventsUpdateRpc,
    EventsDeleteRpc,
    EventMenuItemsRpcs,
    EventMenuItemsListRpc,
    EventMenuItemsGetRpc,
    EventMenuItemsCreateRpc,
    EventMenuItemsUpdateRpc,
    EventMenuItemsDeleteRpc,
} from "@urm/contracts/events"

export {
    EventsRpcLive,
    EventsRpcHandlersTagLive,
    EventMenuItemsRpcLive,
    EventMenuItemsRpcHandlersTagLive,
} from "./handlers.js"

export {
    EventsRepositoryLive,
    EventMenuItemsRepositoryLive,
    findPublishedEventImageUrl,
} from "./repository.js"
export {
    EventsRepository,
    EventMenuItemsRepository,
} from "@urm/contracts/repositories/events"

export type EventsRpcHandlers = {
    "events.list": () => Effect.Effect<
        EventType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "events.get": (params: {
        id: string
    }) => Effect.Effect<
        EventType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "events.create": (params: {
        data: Schema.Schema.Type<typeof CreateEventInput>
    }) => Effect.Effect<
        { item: EventType; txid: number },
        DatabaseError | ConflictError | ValidationError,
        ActiveDomainRequestContext
    >
    "events.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateEventInput>
    }) => Effect.Effect<
        { item: EventType; txid: number },
        NotFoundError | DatabaseError | ValidationError,
        ActiveDomainRequestContext
    >
    "events.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}

export type EventMenuItemsRpcHandlers = {
    "eventMenuItems.list": () => Effect.Effect<
        EventMenuItemType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "eventMenuItems.get": (params: {
        id: string
    }) => Effect.Effect<
        EventMenuItemType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "eventMenuItems.create": (params: {
        data: Schema.Schema.Type<typeof CreateEventMenuItemInput>
    }) => Effect.Effect<
        { item: EventMenuItemType; txid: number },
        DatabaseError | ConflictError | ValidationError,
        ActiveDomainRequestContext
    >
    "eventMenuItems.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateEventMenuItemInput>
    }) => Effect.Effect<
        { item: EventMenuItemType; txid: number },
        NotFoundError | DatabaseError | ValidationError,
        ActiveDomainRequestContext
    >
    "eventMenuItems.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}

export { EventsRpcHandlersTag, EventMenuItemsRpcHandlersTag } from "./tag.js"

export {
    EventsServer,
    EventsLibraryRepository,
    EventsLibraryRepositoryLive,
} from "./remote.ts"
