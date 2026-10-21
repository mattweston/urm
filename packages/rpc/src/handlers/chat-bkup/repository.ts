/**
 * # Chat Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for message operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, asc, eq } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { messages } from "@urm/database/legacy-schema/chat"

import { ChatRepository, type ChatRepositoryType } from "@urm/contracts"
import {
    Message,
    SendMessageRequest,
    UpdateMessageRequest,
} from "@urm/domain/schemas/chat"

import { repositoryError } from "../errors.ts"

const decodeMessage = (row: typeof messages.$inferSelect) =>
    Schema.decodeUnknownEffect(Message)({
        id: row.id,
        domain_id: row.domain_id,
        ...(row.author === null ? {} : { author: row.author }),
        contact_id: row.contact_id,
        body: row.body,
        ...(row.timestamp === null ? {} : { timestamp: row.timestamp }),
        updated_at: row.updated_at,
    }).pipe(Effect.mapError(repositoryError))

export const ChatRepositoryLive = Layer.effect(
    ChatRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: ChatRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        SendMessageRequest
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(messages)
                        .values({
                            ...validated,
                            domain_id,
                            id: crypto.randomUUID(),
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    const inserted_message = inserted[0]
                    if (inserted_message === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert message")
                        )
                    }

                    return {
                        item: yield* decodeMessage(inserted_message),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateMessageRequest
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Filter out undefined values
                    const updateData: Record<string, unknown> = {}
                    for (const [key, value] of Object.entries(validated)) {
                        if (value !== undefined) {
                            updateData[key] = value
                        }
                    }

                    const updated = yield* db
                        .update(messages)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(messages.id, id),
                                eq(messages.domain_id, domain_id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    const updated_message = updated[0]
                    if (updated_message === undefined) {
                        return yield* Effect.fail(
                            repositoryError(`Message with ID ${id} not found`)
                        )
                    }

                    return {
                        item: yield* decodeMessage(updated_message),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(messages)
                        .where(
                            and(
                                eq(messages.id, id),
                                eq(messages.domain_id, domain_id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const message = results[0]
                    if (message === undefined) {
                        return null
                    }

                    return yield* decodeMessage(message)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { limit = 50, contact_id }) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(messages)
                        .where(
                            and(
                                eq(messages.domain_id, domain_id),
                                eq(messages.contact_id, contact_id)
                            )
                        )
                        .orderBy(asc(messages.updated_at))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return yield* Effect.forEach(results, decodeMessage)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(messages)
                        .where(
                            and(
                                eq(messages.id, id),
                                eq(messages.domain_id, domain_id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Message with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
