/**
 * # Media Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for media/images operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq, gt } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { images } from "@urm/database/legacy-schema/media/images"
import {
    Image,
    CreateImageInput,
    UpdateImageInput,
} from "@urm/domain/schemas/media"
import {
    ImagesRepository,
    type ImagesRepositoryType,
} from "@urm/contracts/repositories/media"

import { repositoryError } from "../errors.ts"

type ImageRow = typeof images.$inferSelect

const toImage = (row: ImageRow): Image => {
    return {
        id: row.id,
        url: row.url,
        alt: row.alt,
        text: row.text,
        order_position: row.order_position,
        updated_at: row.updated_at,
        ...(row.width === null || row.width === undefined
            ? {}
            : { width: row.width }),
        ...(row.height === null || row.height === undefined
            ? {}
            : { height: row.height }),
        ...(row.category === null || row.category === undefined
            ? {}
            : { category: row.category }),
    }
}

export const ImagesRepositoryLive = Layer.effect(
    ImagesRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: ImagesRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateImageInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(images)
                        .values({
                            ...validated,
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    const image = inserted[0]

                    if (image === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert image")
                        )
                    }

                    return {
                        item: toImage(image),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateImageInput
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
                        .update(images)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(images.domain_id, domain_id),
                                eq(images.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    const image = updated[0]

                    if (image === undefined) {
                        return yield* Effect.fail(
                            repositoryError(`Image with ID ${id} not found`)
                        )
                    }

                    return {
                        item: toImage(image),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(images)
                        .where(
                            and(
                                eq(images.domain_id, domain_id),
                                eq(images.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const image = results[0]

                    if (image === undefined) {
                        return null
                    }

                    return toImage(image)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { limit = 50, after } = {}) =>
                Effect.gen(function* () {
                    const results = yield* (
                        after === undefined
                            ? db
                                  .select()
                                  .from(images)
                                  .where(eq(images.domain_id, domain_id))
                                  .limit(limit)
                            : db
                                  .select()
                                  .from(images)
                                  .where(
                                      and(
                                          eq(images.domain_id, domain_id),
                                          gt(images.updated_at, after)
                                      )
                                  )
                                  .limit(limit)
                    ).pipe(Effect.mapError(repositoryError))

                    return results.map(toImage)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(images)
                        .where(
                            and(
                                eq(images.domain_id, domain_id),
                                eq(images.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Image with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const findPublicGalleryImageUrl = (
    domain_id: string,
    image_id: string
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const image_rows = yield* db
            .select({ url: images.url })
            .from(images)
            .where(
                and(
                    eq(images.id, image_id),
                    eq(images.domain_id, domain_id),
                    eq(images.category, "gallery")
                )
            )
            .limit(1)

        return image_rows[0]?.url ?? undefined
    })
