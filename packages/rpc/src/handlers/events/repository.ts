/**
 * # Events Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for event operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq, isNull } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import { events, event_menu_items } from "@urm/db/legacy-schema/events"
import {
    Event,
    EventMenuItem,
    CreateEventInput,
    UpdateEventInput,
    CreateEventMenuItemInput,
    UpdateEventMenuItemInput,
} from "@urm/domain/schemas/events"
import type { EventMenuItem as DomainEventMenuItem } from "@urm/domain/schemas/events"

import {
    EventsRepository,
    type EventsRepositoryType,
    EventMenuItemsRepository,
    type EventMenuItemsRepositoryType,
} from "@urm/contracts/repositories/events"

import { repositoryError } from "../errors.ts"

type EventRow = typeof events.$inferSelect
type EventMenuItemRow = typeof event_menu_items.$inferSelect

const isString = (value: unknown): value is string => typeof value === "string"
const isNumber = (value: unknown): value is number => typeof value === "number"

const isEventRow = (row: EventRow | undefined): row is EventRow =>
    row !== undefined &&
    isString(row.id) &&
    isString(row.title) &&
    isString(row.start_time) &&
    isString(row.venue_name) &&
    isString(row.latitude) &&
    isString(row.longitude) &&
    isNumber(row.date) &&
    isNumber(row.updated_at) &&
    typeof row.published === "boolean"

const isEventMenuItemRow = (
    row: EventMenuItemRow | undefined
): row is EventMenuItemRow =>
    row !== undefined &&
    isString(row.id) &&
    isString(row.title) &&
    isString(row.slug) &&
    isNumber(row.price) &&
    isNumber(row.order_position) &&
    isNumber(row.updated_at) &&
    typeof row.published === "boolean"

const toDbMenuCategory = (category: DomainEventMenuItem["category"]) =>
    Schema.decodeUnknownEffect(
        Schema.Literals(["appetizer", "main", "dessert", "drink", "special"])
    )(
        category === "beverage"
            ? "drink"
            : category === "other"
              ? "special"
              : category
    ).pipe(
        Effect.mapError(() =>
            repositoryError(
                "This category is unavailable in the legacy menu repository"
            )
        )
    )

const fromDbMenuCategory = (
    category: EventMenuItemRow["category"]
): DomainEventMenuItem["category"] => {
    if (category === "drink") {
        return "beverage"
    }

    if (category === "special") {
        return "other"
    }

    return category
}

const toEvent = (row: EventRow): Event => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time ?? undefined,
    venue_name: row.venue_name,
    venue_url: row.venue_url ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    tickets_url: row.tickets_url ?? undefined,
    image_url: row.image_url ?? undefined,
    published: row.published,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? undefined,
})

const toEventMenuItem = (row: EventMenuItemRow): EventMenuItem => ({
    id: row.id,
    event_id: row.event_id,
    title: row.title,
    description: row.description ?? undefined,
    content: row.content ?? undefined,
    price: row.price,
    category: fromDbMenuCategory(row.category),
    slug: row.slug,
    image_url: row.image_url ?? undefined,
    dietary_labels: row.dietary_labels ?? undefined,
    allergens: row.allergens ?? undefined,
    published: row.published,
    order_position: row.order_position,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? undefined,
})

export const EventsRepositoryLive = Layer.effect(
    EventsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: EventsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateEventInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(events)
                        .values({
                            ...validated,
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert event")
                        )
                    }

                    const maybeInserted = inserted[0]

                    if (maybeInserted === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert event")
                        )
                    }

                    return {
                        item: toEvent(maybeInserted),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateEventInput
                    )({
                        ...data,
                        id,
                    }).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Filter out undefined values
                    const updateData: Record<string, unknown> = {}
                    for (const [key, value] of Object.entries(validated)) {
                        if (key !== "id" && value !== undefined) {
                            updateData[key] = value
                        }
                    }

                    const updated = yield* db
                        .update(events)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(events.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Event with ID ${id} not found`)
                        )
                    }

                    const maybeUpdated = updated[0]

                    if (maybeUpdated === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to update event")
                        )
                    }

                    return {
                        item: toEvent(maybeUpdated),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(events)
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(events.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const maybeResult = results[0]

                    if (maybeResult === undefined) {
                        return null
                    }

                    return toEvent(maybeResult)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(events)
                        .where(eq(events.domain_id, domain_id))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return results.filter(isEventRow).map(toEvent)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(events)
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(events.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Event with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const findPublishedEventImageUrl = (
    domain_id: string,
    event_id: string
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const event_rows = yield* db
            .select({ image_url: events.image_url })
            .from(events)
            .where(
                and(
                    eq(events.id, event_id),
                    eq(events.domain_id, domain_id),
                    eq(events.published, true),
                    isNull(events.deleted_at)
                )
            )
            .limit(1)

        return event_rows[0]?.image_url ?? undefined
    })

export const EventMenuItemsRepositoryLive = Layer.effect(
    EventMenuItemsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: EventMenuItemsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateEventMenuItemInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const event_rows = yield* db
                        .select({ id: events.id })
                        .from(events)
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(events.id, validated.event_id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (event_rows[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Event not found")
                        )
                    }

                    const inserted = yield* db
                        .insert(event_menu_items)
                        .values({
                            ...validated,
                            category: yield* toDbMenuCategory(
                                validated.category
                            ),
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert event menu item")
                        )
                    }

                    const maybeInserted = inserted[0]

                    if (maybeInserted === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert event menu item")
                        )
                    }

                    return {
                        item: toEventMenuItem(maybeInserted),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id: string, data) =>
                Effect.gen(function* () {
                    const existing = yield* db
                        .select({ id: event_menu_items.id })
                        .from(event_menu_items)
                        .innerJoin(
                            events,
                            eq(event_menu_items.event_id, events.id)
                        )
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(event_menu_items.id, id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (existing[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Event menu item with ID ${id} not found`
                            )
                        )
                    }

                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateEventMenuItemInput
                    )({
                        ...data,
                        id,
                    }).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const normalized = {
                        ...validated,
                        category:
                            validated.category === undefined
                                ? undefined
                                : yield* toDbMenuCategory(validated.category),
                    }

                    // Filter out undefined values
                    const updateData: Record<string, unknown> = {}
                    for (const [key, value] of Object.entries(normalized)) {
                        if (key !== "id" && value !== undefined) {
                            updateData[key] = value
                        }
                    }

                    const updated = yield* db
                        .update(event_menu_items)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(eq(event_menu_items.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Event menu item with ID ${id} not found`
                            )
                        )
                    }

                    const maybeUpdated = updated[0]

                    if (maybeUpdated === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to update event menu item")
                        )
                    }

                    return {
                        item: toEventMenuItem(maybeUpdated),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(event_menu_items)
                        .innerJoin(
                            events,
                            eq(event_menu_items.event_id, events.id)
                        )
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(event_menu_items.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const maybeResult = results[0]

                    if (maybeResult === undefined) {
                        return null
                    }

                    return toEventMenuItem(maybeResult.event_menu_items)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(event_menu_items)
                        .innerJoin(
                            events,
                            eq(event_menu_items.event_id, events.id)
                        )
                        .where(eq(events.domain_id, domain_id))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return results
                        .map((row) => row.event_menu_items)
                        .filter(isEventMenuItemRow)
                        .map(toEventMenuItem)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const existing = yield* db
                        .select({ id: event_menu_items.id })
                        .from(event_menu_items)
                        .innerJoin(
                            events,
                            eq(event_menu_items.event_id, events.id)
                        )
                        .where(
                            and(
                                eq(events.domain_id, domain_id),
                                eq(event_menu_items.id, id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (existing[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Event menu item with ID ${id} not found`
                            )
                        )
                    }

                    const deleted = yield* db
                        .delete(event_menu_items)
                        .where(eq(event_menu_items.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Event menu item with ID ${id} not found`
                            )
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
