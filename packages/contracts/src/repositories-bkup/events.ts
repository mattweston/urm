/**
 * # Events Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateEventInput,
    CreateEventMenuItemInput,
    Event,
    EventMenuItem,
    UpdateEventInput,
    UpdateEventMenuItemInput,
} from "@urm/domain/schemas/events"

export interface EventsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateEventInput>
    ): Effect.Effect<ItemResult<Event>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Schema.Schema.Type<typeof UpdateEventInput>
    ): Effect.Effect<ItemResult<Event>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Event | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: { limit?: number }
    ): Effect.Effect<Event[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export interface EventMenuItemsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateEventMenuItemInput>
    ): Effect.Effect<ItemResult<EventMenuItem>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Schema.Schema.Type<typeof UpdateEventMenuItemInput>
    ): Effect.Effect<ItemResult<EventMenuItem>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<EventMenuItem | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
        }
    ): Effect.Effect<EventMenuItem[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class EventsRepository extends Context.Service<
    EventsRepository,
    EventsRepositoryType
>()("EventsRepository") {}

export class EventMenuItemsRepository extends Context.Service<
    EventMenuItemsRepository,
    EventMenuItemsRepositoryType
>()("EventMenuItemsRepository") {}
