/**
 * # CSV RPC Index
 */

import { Effect, type Schema } from "effect"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    NotFoundError,
    DatabaseError,
    ConflictError,
    CsvUpload,
    CsvData,
    CreateCsvDataRequest,
    CreateCsvUploadRequest,
    UpdateCsvUploadInput,
} from "@urm/domain/schemas/csv"

// Extract types from Effect schemas
export type CsvUploadType = Schema.Schema.Type<typeof CsvUpload>
export type CsvDataType = Schema.Schema.Type<typeof CsvData>

export {
    CsvRpcs,
    CsvUploadsListRpc,
    CsvUploadsGetRpc,
    CsvUploadsCreateRpc,
    CsvUploadsUpdateRpc,
    CsvUploadsDeleteRpc,
    CsvDataCreateRpc,
    CsvDataDeleteRpc,
    CsvDataGetByUploadRpc,
} from "@urm/contracts/csv"

export { CsvRpcLive, CsvRpcHandlersTagLive } from "./handlers.js"

export {
    CsvUploadsRepositoryLive,
    CsvDataRepositoryLive,
} from "./repository.js"
export {
    CsvUploadsRepository,
    CsvDataRepository,
} from "@urm/contracts/repositories/csv"

export type CsvRpcHandlers = {
    "csv.uploads.list": (params: {
        after?: number
    }) => Effect.Effect<
        CsvUploadType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "csv.uploads.get": (params: {
        id: string
    }) => Effect.Effect<
        CsvUploadType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "csv.uploads.create": (params: {
        data: Schema.Schema.Type<typeof CreateCsvUploadRequest>
    }) => Effect.Effect<
        { item: CsvUploadType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    "csv.uploads.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateCsvUploadInput>
    }) => Effect.Effect<
        { item: CsvUploadType; txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "csv.uploads.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "csv.data.create": (params: {
        data: Schema.Schema.Type<typeof CreateCsvDataRequest>
    }) => Effect.Effect<
        { item: CsvDataType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    "csv.data.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "csv.data.get_by_upload": (params: {
        upload_id: string
    }) => Effect.Effect<
        CsvDataType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
}

export { CsvRpcHandlersTag } from "./tag.js"
