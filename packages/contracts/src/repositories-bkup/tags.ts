/**
 * # Tags Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateEntityTagInput,
    CreateTagInput,
    EntityTag,
    Tag,
    UpdateTagInput,
} from "@urm/domain/schemas/tags"

export interface TagsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateTagInput>
    ): Effect.Effect<ItemResult<Tag>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateTagInput>>
    ): Effect.Effect<ItemResult<Tag>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Tag | null, DatabaseError, never>
    findMany(domain_id: string): Effect.Effect<Tag[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export interface EntityTagsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateEntityTagInput>
    ): Effect.Effect<ItemResult<EntityTag>, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            entity_type?: string
            entity_id?: string
        }
    ): Effect.Effect<EntityTag[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
    setTagsForEntity(
        domain_id: string,
        entity_type: string,
        entity_id: string,
        tag_ids: string[]
    ): Effect.Effect<void, DatabaseError, never>
}

export class TagsRepository extends Context.Service<
    TagsRepository,
    TagsRepositoryType
>()("TagsRepository") {}

export class EntityTagsRepository extends Context.Service<
    EntityTagsRepository,
    EntityTagsRepositoryType
>()("EntityTagsRepository") {}
