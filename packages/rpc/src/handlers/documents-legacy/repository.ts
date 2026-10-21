/**
 * # Documents Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for document operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq, like } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { documents } from "@urm/database/legacy-schema/documents"
import {
    Document,
    CreateDocumentInput,
    UpdateDocumentInput,
} from "@urm/domain/schemas/documents"

import {
    DocumentsRepository,
    type DocumentsRepositoryType,
} from "@urm/contracts/repositories/documents"

import { repositoryError } from "../errors.ts"

const nowSeconds = (): number => Math.floor(Date.now() / 1000)

const toDbContentType = (content_type: CreateDocumentInput["content_type"]) =>
    Schema.decodeUnknownEffect(Schema.Literals(["html", "markdown", "plain"]))(
        content_type === "text" || content_type === "rtf"
            ? "plain"
            : content_type
    ).pipe(
        Effect.mapError(() =>
            repositoryError(
                "This content format is unavailable in the legacy document repository"
            )
        )
    )

const toDocument = (row: typeof documents.$inferSelect): Document => ({
    id: row.id,
    title: row.title,
    content: row.content,
    content_type: row.content_type === "plain" ? "text" : row.content_type,
    slug: row.slug ?? undefined,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? undefined,
})

export const DocumentsRepositoryLive = Layer.effect(
    DocumentsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: DocumentsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateDocumentInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const content_type = yield* toDbContentType(
                        validated.content_type
                    )
                    const timestamp = nowSeconds()

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(documents)
                        .values({
                            ...validated,
                            domain_id,
                            content_type,
                            id: validated.id,
                            created_at: timestamp,
                            updated_at: timestamp,
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert document")
                        )
                    }

                    return {
                        item: toDocument(inserted[0]!),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id: string, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateDocumentInput
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
                        .update(documents)
                        .set({
                            ...updateData,
                            updated_at: nowSeconds(),
                        })
                        .where(
                            and(
                                eq(documents.domain_id, domain_id),
                                eq(documents.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Document with ID ${id} not found`)
                        )
                    }

                    return {
                        item: toDocument(updated[0]!),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(documents)
                        .where(
                            and(
                                eq(documents.domain_id, domain_id),
                                eq(documents.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return toDocument(results[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            findBySlug: (domain_id: string, slug: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(documents)
                        .where(
                            and(
                                eq(documents.domain_id, domain_id),
                                eq(documents.slug, slug)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return toDocument(results[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            findManyByIdPrefix: (domain_id: string, prefix: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(documents)
                        .where(
                            and(
                                eq(documents.domain_id, domain_id),
                                like(documents.id, `${prefix}%`)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDocument)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id: string, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(documents)
                        .where(eq(documents.domain_id, domain_id))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDocument)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(documents)
                        .where(
                            and(
                                eq(documents.domain_id, domain_id),
                                eq(documents.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Document with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
