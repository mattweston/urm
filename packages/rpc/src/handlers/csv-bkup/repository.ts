/**
 * # CSV Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for CSV operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 *
 * Provides two separate repositories:
 * - CsvUploadsRepository: Manages csv_uploads table
 * - CsvDataRepository: Manages csv_data table
 *
 * Uses drizzle-orm/effect-postgres which wraps all queries to return Effect instances.
 * When used with yield* in Effect.gen, results are automatically unwrapped.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { and, eq, gt } from "drizzle-orm"
import { DB } from "@urm/database/layer"
import { csv_uploads, csv_data } from "@urm/database/legacy-schema/csv"
import {
    CsvUpload,
    CsvData,
    CreateCsvUploadRequest,
    UpdateCsvUploadInput,
    CreateCsvDataRequest,
} from "@urm/domain/schemas/csv"
import {
    CsvUploadsRepository,
    CsvDataRepository,
    type CsvUploadsRepositoryType,
    type CsvDataRepositoryType,
} from "@urm/contracts/repositories/csv"
import { repositoryError } from "../errors.ts"

type CsvUploadRow = typeof csv_uploads.$inferSelect
type CsvDataRow = typeof csv_data.$inferSelect

const normalizeCsvUpload = (row: CsvUploadRow): CsvUpload => ({
    id: row.id,
    filename: row.filename,
    row_count: row.row_count,
    status: row.status,
    updated_at: row.updated_at,
})

const normalizeCsvData = (row: CsvDataRow): CsvData => ({
    id: row.id,
    upload_id: row.upload_id,
    row_index: row.row_index,
    data: row.data,
    updated_at: row.updated_at,
})

export const CsvUploadsRepositoryLive = Layer.effect(
    CsvUploadsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: CsvUploadsRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateCsvUploadRequest
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    // Insert with drizzle-orm/effect-postgres
                    const inserted = yield* db
                        .insert(csv_uploads)
                        .values({
                            ...validated,
                            id: crypto.randomUUID(),
                            domain_id,
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert CSV upload")
                        )
                    }

                    const upload = inserted[0]
                    if (upload === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert CSV upload")
                        )
                    }

                    return {
                        item: normalizeCsvUpload(upload),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            update: (domain_id, id: string, data) =>
                Effect.gen(function* () {
                    // Validate input against update schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        UpdateCsvUploadInput
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
                        .update(csv_uploads)
                        .set({
                            ...updateData,
                            updated_at: Date.now(),
                        })
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_uploads.id, id)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(
                                `CSV upload with ID ${id} not found`
                            )
                        )
                    }

                    const upload = updated[0]
                    if (upload === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `CSV upload with ID ${id} not found`
                            )
                        )
                    }

                    return {
                        item: normalizeCsvUpload(upload),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(csv_uploads)
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_uploads.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const upload = results[0]
                    return upload === undefined
                        ? null
                        : normalizeCsvUpload(upload)
                }).pipe(Effect.mapError(repositoryError)),

            findMany: (domain_id, { limit = 50, after = 0 } = {}) =>
                Effect.gen(function* () {
                    const results = yield* (
                        after > 0
                            ? db
                                  .select()
                                  .from(csv_uploads)
                                  .where(
                                      and(
                                          eq(csv_uploads.domain_id, domain_id),
                                          gt(csv_uploads.updated_at, after)
                                      )
                                  )
                                  .limit(limit)
                            : db
                                  .select()
                                  .from(csv_uploads)
                                  .where(eq(csv_uploads.domain_id, domain_id))
                                  .limit(limit)
                    ).pipe(Effect.mapError(repositoryError))

                    return results.map(normalizeCsvUpload)
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const upload = yield* db
                        .select({ id: csv_uploads.id })
                        .from(csv_uploads)
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_uploads.id, id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (upload[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(
                                `CSV upload with ID ${id} not found`
                            )
                        )
                    }

                    yield* db
                        .delete(csv_data)
                        .where(eq(csv_data.upload_id, id))
                        .pipe(Effect.mapError(repositoryError))

                    const deleted = yield* db
                        .delete(csv_uploads)
                        .where(eq(csv_uploads.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0)
                        return yield* Effect.fail(
                            repositoryError(
                                `CSV upload with ID ${id} not found`
                            )
                        )
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)

export const CsvDataRepositoryLive = Layer.effect(
    CsvDataRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const repository: CsvDataRepositoryType = {
            insert: (domain_id, data) =>
                Effect.gen(function* () {
                    // Validate input against schema
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateCsvDataRequest
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const upload = yield* db
                        .select({ id: csv_uploads.id })
                        .from(csv_uploads)
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_uploads.id, validated.upload_id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (upload[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError("CSV upload not found")
                        )
                    }

                    const inserted = yield* db
                        .insert(csv_data)
                        .values({
                            ...validated,
                            id: crypto.randomUUID(),
                            updated_at: Date.now(),
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert CSV data")
                        )
                    }

                    const data_row = inserted[0]
                    if (data_row === undefined) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert CSV data")
                        )
                    }

                    return {
                        item: normalizeCsvData(data_row),
                        txid: 0, // TODO: Get actual txid from PostgreSQL
                    }
                }).pipe(Effect.mapError(repositoryError)),

            findById: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select({ data: csv_data })
                        .from(csv_data)
                        .innerJoin(
                            csv_uploads,
                            eq(csv_data.upload_id, csv_uploads.id)
                        )
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_data.id, id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    const data_row = results[0]
                    return data_row === undefined
                        ? null
                        : normalizeCsvData(data_row.data)
                }).pipe(Effect.mapError(repositoryError)),

            findByUploadId: (domain_id, upload_id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select({ data: csv_data })
                        .from(csv_data)
                        .innerJoin(
                            csv_uploads,
                            eq(csv_data.upload_id, csv_uploads.id)
                        )
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_data.upload_id, upload_id)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(({ data }) => normalizeCsvData(data))
                }).pipe(Effect.mapError(repositoryError)),

            delete: (domain_id, id: string) =>
                Effect.gen(function* () {
                    const owned = yield* db
                        .select({ id: csv_data.id })
                        .from(csv_data)
                        .innerJoin(
                            csv_uploads,
                            eq(csv_data.upload_id, csv_uploads.id)
                        )
                        .where(
                            and(
                                eq(csv_uploads.domain_id, domain_id),
                                eq(csv_data.id, id)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    if (owned[0] === undefined) {
                        return yield* Effect.fail(
                            repositoryError(`CSV data with ID ${id} not found`)
                        )
                    }

                    const deleted = yield* db
                        .delete(csv_data)
                        .where(eq(csv_data.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (deleted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`CSV data with ID ${id} not found`)
                        )
                    }
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
