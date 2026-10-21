/**
 * # Events RPC Routes
 *
 * Effect RPC definitions for events and event menu items operations.
 */

import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    CreateEventInput,
    CreateEventMenuItemInput,
    DatabaseError,
    Event,
    EventMenuItem,
    NotFoundError,
    UpdateEventInput,
    UpdateEventMenuItemInput,
} from "@urm/domain/schemas/events"
import { ValidationError } from "@urm/domain/errors"

export const EventsListRpc = Rpc.make("events.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Event),
    error: DatabaseError,
})

export const EventsGetRpc = Rpc.make("events.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Event,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const EventsCreateRpc = Rpc.make("events.create", {
    payload: Schema.Struct({
        data: CreateEventInput,
    }),
    success: Schema.Struct({
        item: Event,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const EventsUpdateRpc = Rpc.make("events.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateEventInput,
    }),
    success: Schema.Struct({
        item: Event,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
})

export const EventsDeleteRpc = Rpc.make("events.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

const PublicEventsRpcs = RpcGroup.make(EventsListRpc, EventsGetRpc).middleware(
    ActiveDomainRpcMiddleware
)

const AuthenticatedEventsRpcs = RpcGroup.make(
    EventsCreateRpc,
    EventsUpdateRpc,
    EventsDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const EventsRpcs = PublicEventsRpcs.merge(AuthenticatedEventsRpcs)

export const EventMenuItemsListRpc = Rpc.make("eventMenuItems.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(EventMenuItem),
    error: DatabaseError,
})

export const EventMenuItemsGetRpc = Rpc.make("eventMenuItems.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: EventMenuItem,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const EventMenuItemsCreateRpc = Rpc.make("eventMenuItems.create", {
    payload: Schema.Struct({
        data: CreateEventMenuItemInput,
    }),
    success: Schema.Struct({
        item: EventMenuItem,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const EventMenuItemsUpdateRpc = Rpc.make("eventMenuItems.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateEventMenuItemInput,
    }),
    success: Schema.Struct({
        item: EventMenuItem,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
})

export const EventMenuItemsDeleteRpc = Rpc.make("eventMenuItems.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

const AuthenticatedEventMenuItemsRpcs = RpcGroup.make(
    EventMenuItemsListRpc,
    EventMenuItemsGetRpc
)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const DomainManagerEventMenuItemsRpcs = RpcGroup.make(
    EventMenuItemsCreateRpc,
    EventMenuItemsUpdateRpc,
    EventMenuItemsDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const EventMenuItemsRpcs = AuthenticatedEventMenuItemsRpcs.merge(
    DomainManagerEventMenuItemsRpcs
)
