/**
 * # CSV RPC Handlers
 *
 * Effect RPC handlers for CSV operations.
 * Uses generic repositories for database operations.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { CsvRpcs } from "@urm/contracts/csv"
import {
    CsvUploadsRepository,
    CsvDataRepository,
} from "@urm/contracts/repositories/csv"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { CsvRpcHandlersTag } from "./tag.js"
import { DatabaseError, NotFoundError } from "@urm/domain/schemas/csv"

const CsvRpcHandlersLive = Effect.gen(function* () {
    const uploadsRepo = yield* CsvUploadsRepository
    const dataRepo = yield* CsvDataRepository

    return CsvRpcs.of({
        // List CSV uploads (optionally filtered by timestamp)
        "csv.uploads.list": ({ after }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* uploadsRepo
                    .findMany(activeDomain.domainId, {
                        limit: 50,
                        ...(after === undefined ? {} : { after }),
                    })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch CSV uploads",
                                })
                        )
                    )
            }),

        // Get CSV upload by ID
        "csv.uploads.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* uploadsRepo
                    .findById(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen((result) => {
                            if (!result) {
                                return Effect.fail(
                                    new NotFoundError({
                                        message: `CSV upload with id ${id} not found`,
                                    })
                                )
                            }
                            return Effect.succeed(result)
                        }),
                        Effect.mapError((err) => {
                            if (err instanceof NotFoundError) return err
                            return new DatabaseError({
                                message: "Failed to fetch CSV upload",
                            })
                        })
                    )
            }),

        // Create a new CSV upload
        "csv.uploads.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* uploadsRepo
                    .insert(activeDomain.domainId, data)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to create CSV upload",
                                })
                        )
                    )
            }),

        // Update a CSV upload
        "csv.uploads.update": ({ id, data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* uploadsRepo
                    .update(activeDomain.domainId, id, data)
                    .pipe(
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `CSV upload with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to update CSV upload",
                            })
                        })
                    )
            }),

        // Delete a CSV upload (hard delete)
        "csv.uploads.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* uploadsRepo
                    .delete(activeDomain.domainId, id)
                    .pipe(
                        Effect.andThen(() => Effect.succeed({ txid: 0 })),
                        Effect.mapError((err) => {
                            if (
                                err instanceof Error &&
                                err.message.includes("not found")
                            ) {
                                return new NotFoundError({
                                    message: `CSV upload with id ${id} not found`,
                                })
                            }
                            return new DatabaseError({
                                message: "Failed to delete CSV upload",
                            })
                        })
                    )
            }),

        // Create CSV data row
        "csv.data.create": ({ data }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* dataRepo.insert(activeDomain.domainId, data).pipe(
                    Effect.mapError(
                        () =>
                            new DatabaseError({
                                message: "Failed to create CSV data",
                            })
                    )
                )
            }),

        // Delete CSV data row
        "csv.data.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* dataRepo.delete(activeDomain.domainId, id).pipe(
                    Effect.andThen(() => Effect.succeed({ txid: 0 })),
                    Effect.mapError((err) => {
                        if (
                            err instanceof Error &&
                            err.message.includes("not found")
                        ) {
                            return new NotFoundError({
                                message: `CSV data with id ${id} not found`,
                            })
                        }
                        return new DatabaseError({
                            message: "Failed to delete CSV data",
                        })
                    })
                )
            }),

        // Get CSV data by upload ID
        "csv.data.get_by_upload": ({ upload_id }: { upload_id: string }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                return yield* dataRepo
                    .findByUploadId(activeDomain.domainId, upload_id)
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch CSV data",
                                })
                        )
                    )
            }),
    })
})

export const CsvRpcLive = CsvRpcs.toLayer(CsvRpcHandlersLive)

export const CsvRpcHandlersTagLive = Layer.effect(
    CsvRpcHandlersTag,
    CsvRpcHandlersLive
)
