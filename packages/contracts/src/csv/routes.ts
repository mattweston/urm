import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    CreateCsvDataRequest,
    CreateCsvUploadRequest,
    CsvData,
    CsvUpload,
    DatabaseError,
    NotFoundError,
    UpdateCsvUploadInput,
} from "@urm/domain/schemas/csv"

export const CsvUploadsListRpc = Rpc.make("csv.uploads.list", {
    payload: Schema.Struct({
        after: Schema.optional(Schema.Number),
    }),
    success: Schema.Array(CsvUpload),
    error: DatabaseError,
})

export const CsvUploadsGetRpc = Rpc.make("csv.uploads.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: CsvUpload,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const CsvUploadsCreateRpc = Rpc.make("csv.uploads.create", {
    payload: Schema.Struct({
        data: CreateCsvUploadRequest,
    }),
    success: Schema.Struct({
        item: CsvUpload,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const CsvUploadsUpdateRpc = Rpc.make("csv.uploads.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateCsvUploadInput,
    }),
    success: Schema.Struct({
        item: CsvUpload,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const CsvUploadsDeleteRpc = Rpc.make("csv.uploads.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const CsvDataCreateRpc = Rpc.make("csv.data.create", {
    payload: Schema.Struct({
        data: CreateCsvDataRequest,
    }),
    success: Schema.Struct({
        item: CsvData,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const CsvDataDeleteRpc = Rpc.make("csv.data.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const CsvDataGetByUploadRpc = Rpc.make("csv.data.get_by_upload", {
    payload: Schema.Struct({
        upload_id: Schema.String,
    }),
    success: Schema.Array(CsvData),
    error: DatabaseError,
})

const AuthenticatedCsvRpcs = RpcGroup.make(
    CsvUploadsListRpc,
    CsvUploadsGetRpc,
    CsvDataGetByUploadRpc
)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const DomainManagerCsvRpcs = RpcGroup.make(
    CsvUploadsCreateRpc,
    CsvUploadsUpdateRpc,
    CsvUploadsDeleteRpc,
    CsvDataCreateRpc,
    CsvDataDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const CsvRpcs = AuthenticatedCsvRpcs.merge(DomainManagerCsvRpcs)
