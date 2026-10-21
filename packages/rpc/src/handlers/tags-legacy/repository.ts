/**
 * # Tags RPC Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for tags operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { tags, entity_tags } from "@urm/database/legacy-schema/tags"
import {
    Tag,
    EntityTag,
    CreateTagInput,
    UpdateTagInput,
    CreateEntityTagInput,
} from "@urm/domain/schemas/tags"
import {
    EntityTagsRepository,
    type EntityTagsRepositoryType,
    TagsRepository,
    type TagsRepositoryType,
} from "@urm/contracts/repositories/tags"
import { repositoryError } from "../errors.ts"

type TagRow = typeof tags.$inferSelect
type EntityTagRow = typeof entity_tags.$inferSelect

const normalizeTag = (row: TagRow): Tag => ({
    id: row.id,
    name: row.name,
    color: row.color,
    updated_at: row.updated_at,
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.deleted_at === null ? {} : { deleted_at: row.deleted_at }),
})

const normalizeEntityTag = (row: EntityTagRow): EntityTag => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    tag_id: row.tag_id,
    updated_at: row.updated_at,
})

export const TagsRepositoryLive = Layer.effect(
    TagsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: TagsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateTagInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(tags)
                        .values({
                            ...validated,
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert tag")
                        )
                    }

                    const insertedTag = inserted[0]

                    if (insertedTag === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert tag")
                        )
                    }

                    return {
                        item: normalizeTag(insertedTag),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateTagInput
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
                        .update(tags)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                eq(tags.id, id),
                                isNull(tags.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Tag with ID ${id} not found`)
                        )
                    }

                    const updatedTag = updated[0]

                    if (updatedTag === undefined) {
                        return yield* Effect.fail(
                            repositoryError(`Tag with ID ${id} not found`)
                        )
                    }

                    return {
                        item: normalizeTag(updatedTag),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(tags)
                        .where(
                            and(eq(tags.domain_id, domain_id), eq(tags.id, id))
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const tag = results[0]

                    if (tag === undefined) {
                        return null
                    }

                    return normalizeTag(tag)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(tags)
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                isNull(tags.deleted_at)
                            )
                        )
                        .orderBy(desc(tags.updated_at))
                        .pipe(Effect.mapError(repositoryError))

                    return results.map((row) => normalizeTag(row))
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const now = Date.now()

                    const deleted = yield* db
                        .update(tags)
                        .set({
                            deleted_at: now,
                            updated_at: now,
                        })
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                eq(tags.id, id),
                                isNull(tags.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Tag with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const EntityTagsRepositoryLive = Layer.effect(
    EntityTagsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: EntityTagsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateEntityTagInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const tag_rows = yield* db
                        .select({ id: tags.id })
                        .from(tags)
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                eq(tags.id, validated.tag_id),
                                isNull(tags.deleted_at)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (tag_rows[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Tag not found")
                        )
                    }

                    const inserted = yield* db
                        .insert(entity_tags)
                        .values({
                            ...validated,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert entity tag")
                        )
                    }

                    const insertedEntityTag = inserted[0]

                    if (insertedEntityTag === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert entity tag")
                        )
                    }

                    return {
                        item: normalizeEntityTag(insertedEntityTag),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { entity_type, entity_id } = {}) =>
                Effect.gen(function* () {
                    if (entity_type && entity_id) {
                        const results = yield* db
                            .select({ entity_tag: entity_tags })
                            .from(entity_tags)
                            .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                            .where(
                                and(
                                    eq(tags.domain_id, domain_id),
                                    eq(entity_tags.entity_type, entity_type),
                                    eq(entity_tags.entity_id, entity_id)
                                )
                            )
                            .orderBy(desc(entity_tags.updated_at))
                            .pipe(Effect.mapError(repositoryError))

                        return results.map(({ entity_tag }) =>
                            normalizeEntityTag(entity_tag)
                        )
                    }

                    if (entity_type) {
                        const results = yield* db
                            .select({ entity_tag: entity_tags })
                            .from(entity_tags)
                            .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                            .where(
                                and(
                                    eq(tags.domain_id, domain_id),
                                    eq(entity_tags.entity_type, entity_type)
                                )
                            )
                            .orderBy(desc(entity_tags.updated_at))
                            .pipe(Effect.mapError(repositoryError))

                        return results.map(({ entity_tag }) =>
                            normalizeEntityTag(entity_tag)
                        )
                    }

                    if (entity_id) {
                        const results = yield* db
                            .select({ entity_tag: entity_tags })
                            .from(entity_tags)
                            .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                            .where(
                                and(
                                    eq(tags.domain_id, domain_id),
                                    eq(entity_tags.entity_id, entity_id)
                                )
                            )
                            .orderBy(desc(entity_tags.updated_at))
                            .pipe(Effect.mapError(repositoryError))

                        return results.map(({ entity_tag }) =>
                            normalizeEntityTag(entity_tag)
                        )
                    }

                    const results = yield* db
                        .select({ entity_tag: entity_tags })
                        .from(entity_tags)
                        .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                        .where(eq(tags.domain_id, domain_id))
                        .orderBy(desc(entity_tags.updated_at))
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(({ entity_tag }) =>
                        normalizeEntityTag(entity_tag)
                    )
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const owned = yield* db
                        .select({ id: entity_tags.id })
                        .from(entity_tags)
                        .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                eq(entity_tags.id, id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (owned[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Entity tag with ID ${id} not found`
                            )
                        )
                    }

                    const deleted = yield* db
                        .delete(entity_tags)
                        .where(eq(entity_tags.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Entity tag with ID ${id} not found`
                            )
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),

            setTagsForEntity: (
                domain_id,
                entity_type: string,
                entity_id: string,
                tag_ids: string[]
            ) =>
                Effect.gen(function* () {
                    const uniqueTagIds = [...new Set(tag_ids)]
                    const owned_tags =
                        uniqueTagIds.length === 0
                            ? []
                            : yield* db
                                  .select({ id: tags.id })
                                  .from(tags)
                                  .where(
                                      and(
                                          eq(tags.domain_id, domain_id),
                                          isNull(tags.deleted_at),
                                          inArray(tags.id, uniqueTagIds)
                                      )
                                  )
                                  .pipe(Effect.mapError(repositoryError))

                    if (owned_tags.length !== uniqueTagIds.length) {
                        return yield* Effect.fail(
                            repositoryError("Tag not found")
                        )
                    }

                    const existing = yield* db
                        .select({ id: entity_tags.id })
                        .from(entity_tags)
                        .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
                        .where(
                            and(
                                eq(tags.domain_id, domain_id),
                                eq(entity_tags.entity_type, entity_type),
                                eq(entity_tags.entity_id, entity_id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const existing_ids = existing.map(({ id }) => id)
                    if (existing_ids.length > 0) {
                        yield* db
                            .delete(entity_tags)
                            .where(inArray(entity_tags.id, existing_ids))
                            .pipe(Effect.mapError(repositoryError))
                    }

                    // Insert new tags
                    if (uniqueTagIds.length > 0) {
                        const insertValues = uniqueTagIds.map(
                            (tag_id: string) => ({
                                id: `${entity_type}:${entity_id}:${tag_id}`,
                                entity_type,
                                entity_id,
                                tag_id,
                                updated_at: Date.now(),
                            })
                        )

                        yield* db
                            .insert(entity_tags)
                            .values(insertValues)
                            .pipe(Effect.mapError(repositoryError))
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
