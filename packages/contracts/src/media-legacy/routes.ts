import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    CreateImageInput,
    DatabaseError,
    Image,
    NotFoundError,
    UpdateImageInput,
} from "@urm/domain/schemas/media"

export const ImagesListRpc = Rpc.make("images.list", {
    payload: Schema.Struct({
        after: Schema.optional(Schema.Number),
    }),
    success: Schema.Array(Image),
    error: DatabaseError,
})

export const ImagesGetRpc = Rpc.make("images.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Image,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const ImagesCreateRpc = Rpc.make("images.create", {
    payload: Schema.Struct({
        data: CreateImageInput,
    }),
    success: Schema.Struct({
        item: Image,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const ImagesUpdateRpc = Rpc.make("images.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateImageInput,
    }),
    success: Schema.Struct({
        item: Image,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const ImagesDeleteRpc = Rpc.make("images.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

const PublicMediaRpcs = RpcGroup.make(ImagesListRpc, ImagesGetRpc).middleware(
    ActiveDomainRpcMiddleware
)

const AuthenticatedMediaRpcs = RpcGroup.make(
    ImagesCreateRpc,
    ImagesUpdateRpc,
    ImagesDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const MediaRpcs = PublicMediaRpcs.merge(AuthenticatedMediaRpcs)
