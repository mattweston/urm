import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    CreateEntityTagInput,
    CreateTagInput,
    DatabaseError,
    EntityTag,
    NotFoundError,
    Tag,
    SetTagsForEntityInput,
    UpdateTagInput,
    ValidationError,
} from "@urm/domain/schemas/tags"

export const TagsListRpc = Rpc.make("tags.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Tag),
    error: DatabaseError,
})

export const TagsGetRpc = Rpc.make("tags.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Tag,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const TagsCreateRpc = Rpc.make("tags.create", {
    payload: Schema.Struct({
        data: CreateTagInput,
    }),
    success: Schema.Struct({
        item: Tag,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const TagsUpdateRpc = Rpc.make("tags.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateTagInput,
    }),
    success: Schema.Struct({
        item: Tag,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError, ValidationError]),
})

export const TagsDeleteRpc = Rpc.make("tags.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const EntityTagsListRpc = Rpc.make("tags.entity_tags_list", {
    payload: Schema.Struct({
        entity_type: Schema.optional(Schema.String),
        entity_id: Schema.optional(Schema.String),
    }),
    success: Schema.Array(EntityTag),
    error: DatabaseError,
})

export const EntityTagsCreateRpc = Rpc.make("tags.entity_tags_create", {
    payload: Schema.Struct({
        data: CreateEntityTagInput,
    }),
    success: Schema.Struct({
        item: EntityTag,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError, ValidationError]),
})

export const EntityTagsDeleteRpc = Rpc.make("tags.entity_tags_delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const EntityTagsSetRpc = Rpc.make("tags.entity_tags_set", {
    payload: SetTagsForEntityInput,
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ValidationError]),
})

const AuthenticatedTagsRpcs = RpcGroup.make(
    TagsListRpc,
    TagsGetRpc,
    EntityTagsListRpc
)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const DomainManagerTagsRpcs = RpcGroup.make(
    TagsCreateRpc,
    TagsUpdateRpc,
    TagsDeleteRpc,
    EntityTagsCreateRpc,
    EntityTagsDeleteRpc,
    EntityTagsSetRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const TagsRpcs = AuthenticatedTagsRpcs.merge(DomainManagerTagsRpcs)
