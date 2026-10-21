/**
 * # Media Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateImageInput,
    Image,
    UpdateImageInput,
} from "@urm/domain/schemas/media"

export interface ImagesRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateImageInput>
    ): Effect.Effect<ItemResult<Image>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateImageInput>>
    ): Effect.Effect<ItemResult<Image>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Image | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
            after?: number
        }
    ): Effect.Effect<Image[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class ImagesRepository extends Context.Service<
    ImagesRepository,
    ImagesRepositoryType
>()("ImagesRepository") {}
