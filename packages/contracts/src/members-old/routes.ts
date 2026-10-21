import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    DatabaseError,
    Member,
    NotFoundError,
    UpdateMemberInput,
} from "@urm/domain/schemas/members"

const CreateMemberRpcData = Schema.Struct({
    first: Schema.String,
    last: Schema.String,
    twitter: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String),
})

export const MembersListRpc = Rpc.make("members.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Member),
    error: DatabaseError,
})

export const MembersGetRpc = Rpc.make("members.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Member,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const MembersCreateRpc = Rpc.make("members.create", {
    payload: Schema.Struct({
        data: CreateMemberRpcData,
    }),
    success: Schema.Struct({
        item: Member,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const MembersUpdateRpc = Rpc.make("members.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateMemberInput,
    }),
    success: Schema.Struct({
        item: Member,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const MembersDeleteRpc = Rpc.make("members.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const MembersRpcs = RpcGroup.make(
    MembersListRpc,
    MembersGetRpc,
    MembersCreateRpc,
    MembersUpdateRpc,
    MembersDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
