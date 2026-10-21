/**
 * # Documents Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and table from db/schema (database structure).
 *
 * This file is the "model aggregator" for the documents feature:
 * - Drizzle table: documents
 * - Effect schemas: Document, CreateDocumentInput, UpdateDocumentInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Document,
    CreateDocumentInput,
    UpdateDocumentInput,
    ContentType,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/documents"
import { Context, type Effect, type Schema } from "effect"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"

// Re-export Drizzle table and inferred types
export { documents } from "@urm/database/legacy-schema/documents"
export type {
    Document as DocumentRow,
    NewDocument,
} from "@urm/database/legacy-schema/documents"

// Re-export Effect schemas (used in routes and handlers)
export {
    Document,
    CreateDocumentInput,
    UpdateDocumentInput,
    ContentType,
    NotFoundError,
    DatabaseError,
    ConflictError,
}

export const DocumentsModel = {
    insert: CreateDocumentInput,
    update: UpdateDocumentInput,
    select: Document,
}

export type DocumentsRpcHandlers = {
    list: () => Effect.Effect<
        Schema.Schema.Type<typeof Document>[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "documents.list_blog_posts": () => Effect.Effect<
        Schema.Schema.Type<typeof Document>[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    get: (params: {
        id: string
    }) => Effect.Effect<
        Schema.Schema.Type<typeof Document>,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "documents.get_by_slug": (params: {
        slug: string
    }) => Effect.Effect<
        Schema.Schema.Type<typeof Document>,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    create: (params: {
        data: Schema.Schema.Type<typeof CreateDocumentInput>
    }) => Effect.Effect<
        { item: Schema.Schema.Type<typeof Document>; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext
    >
    update: (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateDocumentInput>
    }) => Effect.Effect<
        { item: Schema.Schema.Type<typeof Document>; txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    delete: (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}

export class DocumentsRpcHandlersTag extends Context.Service<
    DocumentsRpcHandlersTag,
    DocumentsRpcHandlers
>()("DocumentsRpcHandlers") {}
