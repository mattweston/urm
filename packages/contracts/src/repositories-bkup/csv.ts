/**
 * # CSV Repository
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateCsvUploadRequest,
    CreateCsvDataRequest,
    CsvData,
    CsvUpload,
    UpdateCsvUploadInput,
} from "@urm/domain/schemas/csv"

export interface CsvDataRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateCsvDataRequest>
    ): Effect.Effect<ItemResult<CsvData>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<CsvData | null, DatabaseError, never>
    findByUploadId(
        domain_id: string,
        upload_id: string
    ): Effect.Effect<CsvData[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class CsvDataRepository extends Context.Service<
    CsvDataRepository,
    CsvDataRepositoryType
>()("CsvDataRepository") {}

export interface CsvUploadsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateCsvUploadRequest>
    ): Effect.Effect<ItemResult<CsvUpload>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateCsvUploadInput>>
    ): Effect.Effect<ItemResult<CsvUpload>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<CsvUpload | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
            after?: number
        }
    ): Effect.Effect<CsvUpload[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class CsvUploadsRepository extends Context.Service<
    CsvUploadsRepository,
    CsvUploadsRepositoryType
>()("CsvUploadsRepository") {}
