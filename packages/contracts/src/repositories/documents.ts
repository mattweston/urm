/**
 * # Documents Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateDocumentInput,
    Document,
    UpdateDocumentInput,
} from "@urm/domain/schemas/documents"

export interface DocumentsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateDocumentInput>
    ): Effect.Effect<ItemResult<Document>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Schema.Schema.Type<typeof UpdateDocumentInput>
    ): Effect.Effect<ItemResult<Document>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Document | null, DatabaseError, never>
    findBySlug(
        domain_id: string,
        slug: string
    ): Effect.Effect<Document | null, DatabaseError, never>
    findManyByIdPrefix(
        domain_id: string,
        prefix: string
    ): Effect.Effect<Document[], DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
        }
    ): Effect.Effect<Document[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class DocumentsRepository extends Context.Service<
    DocumentsRepository,
    DocumentsRepositoryType
>()("DocumentsRepository") {}
