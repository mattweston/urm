/**
 * # Tags RPC
 */

import { Effect, type Schema } from "effect"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    Tag,
    EntityTag,
    CreateEntityTagInput,
    CreateTagInput,
    UpdateTagInput,
} from "@urm/domain/schemas/tags"
import type {
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/errors"

// Extract types from Effect schemas
export type TagType = Schema.Schema.Type<typeof Tag>
export type EntityTagType = Schema.Schema.Type<typeof EntityTag>

export {
    TagsRpcs,
    TagsListRpc,
    TagsGetRpc,
    TagsCreateRpc,
    TagsUpdateRpc,
    TagsDeleteRpc,
    EntityTagsListRpc,
    EntityTagsCreateRpc,
    EntityTagsDeleteRpc,
    EntityTagsSetRpc,
} from "@urm/contracts/tags-legacy"

export { TagsRpcLive, TagsRpcHandlersTagLive } from "./handlers.js"

export { TagsRepositoryLive, EntityTagsRepositoryLive } from "./repository.js"
export {
    TagsRepository,
    EntityTagsRepository,
} from "@urm/contracts/repositories/tags"

export type TagsRpcHandlers = {
    "tags.list": () => Effect.Effect<
        TagType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.get": (params: {
        id: string
    }) => Effect.Effect<
        TagType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.create": (params: {
        data: Schema.Schema.Type<typeof CreateTagInput>
    }) => Effect.Effect<
        { item: TagType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    "tags.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateTagInput>
    }) => Effect.Effect<
        { item: TagType; txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.entity_tags_list": (params: {
        entity_type?: string
        entity_id?: string
    }) => Effect.Effect<
        EntityTagType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.entity_tags_create": (params: {
        data: Schema.Schema.Type<typeof CreateEntityTagInput>
    }) => Effect.Effect<
        { item: EntityTagType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    "tags.entity_tags_delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "tags.entity_tags_set": (params: {
        entity_type: string
        entity_id: string
        tag_ids: string[]
    }) => Effect.Effect<
        { txid: number },
        DatabaseError,
        ActiveDomainRequestContext
    >
}

export { TagsRpcHandlersTag } from "./tag.js"
