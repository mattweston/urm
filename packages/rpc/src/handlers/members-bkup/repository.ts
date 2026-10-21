/**
 * # Members Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for members operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import { members } from "@urm/db/legacy-schema/members"
import {
    Member,
    CreateMemberInput,
    UpdateMemberInput,
} from "@urm/domain/schemas/members"
import {
    MembersRepository,
    type MembersRepositoryType,
} from "@urm/contracts/repositories/members"
import { repositoryError } from "../errors.ts"

type MemberRow = typeof members.$inferSelect

const isMemberRow = (row: MemberRow | undefined): row is MemberRow =>
    row !== undefined

const toMember = (row: MemberRow): Member => ({
    ...row,
    twitter: row.twitter ?? undefined,
    avatar: row.avatar ?? undefined,
    notes: row.notes ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
})

export const MembersRepositoryLive = Layer.effect(
    MembersRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: MembersRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateMemberInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(members)
                        .values({
                            ...validated,
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert member")
                        )
                    }

                    const maybeInserted = inserted[0]

                    if (maybeInserted === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert member")
                        )
                    }

                    return {
                        item: toMember(maybeInserted),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id: string, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateMemberInput
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
                        .update(members)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(members.domain_id, domain_id),
                                eq(members.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Member with ID ${id} not found`)
                        )
                    }

                    const maybeUpdated = updated[0]

                    if (maybeUpdated === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to update member")
                        )
                    }

                    return {
                        item: toMember(maybeUpdated),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(members)
                        .where(
                            and(
                                eq(members.domain_id, domain_id),
                                eq(members.id, id)
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

                    return toMember(maybeResult)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id: string, { limit = 50 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(members)
                        .where(eq(members.domain_id, domain_id))
                        .limit(limit)
                        .pipe(Effect.mapError(repositoryError))

                    return results.filter(isMemberRow).map(toMember)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id: string, id: string) =>
                Effect.gen(function* () {
                    const deleted = yield* db
                        .delete(members)
                        .where(
                            and(
                                eq(members.domain_id, domain_id),
                                eq(members.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Member with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
