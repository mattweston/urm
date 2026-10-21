/**
 * # Events Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the events feature:
 * - Drizzle tables: events, event_menu_items
 * - Effect schemas: Event, EventMenuItem, CreateEventInput, UpdateEventInput, CreateEventMenuItemInput, UpdateEventMenuItemInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Event,
    EventMenuItem,
    MenuCategory,
    CreateEventInput,
    UpdateEventInput,
    CreateEventMenuItemInput,
    UpdateEventMenuItemInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/events"
import { ValidationError } from "@urm/domain/errors"

// Re-export Drizzle tables and inferred types
export { events, event_menu_items } from "@urm/db/legacy-schema/events"
export type {
    Event as EventRow,
    NewEvent,
    EventMenuItem as EventMenuItemRow,
    NewEventMenuItem,
} from "@urm/db/legacy-schema/events"

// Re-export Effect schemas (used in routes and handlers)
export {
    Event,
    EventMenuItem,
    MenuCategory,
    CreateEventInput,
    UpdateEventInput,
    CreateEventMenuItemInput,
    UpdateEventMenuItemInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
}

export const EventsModel = {
    insert: CreateEventInput,
    update: UpdateEventInput,
    select: Event,
}

export const EventMenuItemsModel = {
    insert: CreateEventMenuItemInput,
    update: UpdateEventMenuItemInput,
    select: EventMenuItem,
}
