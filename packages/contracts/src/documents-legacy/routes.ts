/**
 * # Documents RPC Routes
 *
 * Effect RPC definitions for documents operations.
 */

import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import {
    ConflictError,
    CreateDocumentInput,
    DatabaseError,
    Document,
    NotFoundError,
    UpdateDocumentInput,
} from "@urm/domain/schemas/documents"

// Unnamespaced, and collides with chat's MessagesListRpc once both groups are
// merged. See src/chat/routes.ts.
export const DocumentsListRpc = Rpc.make("list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Document),
    error: DatabaseError,
})

export const DocumentsListBlogPostsRpc = Rpc.make("documents.list_blog_posts", {
    payload: Schema.Struct({}),
    success: Schema.Array(Document),
    error: DatabaseError,
})

export const DocumentsGetRpc = Rpc.make("get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Document,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const DocumentsGetBySlugRpc = Rpc.make("documents.get_by_slug", {
    payload: Schema.Struct({
        slug: Schema.String,
    }),
    success: Document,
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const DocumentsCreateRpc = Rpc.make("create", {
    payload: Schema.Struct({
        data: CreateDocumentInput,
    }),
    success: Schema.Struct({
        item: Document,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const DocumentsUpdateRpc = Rpc.make("update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: UpdateDocumentInput,
    }),
    success: Schema.Struct({
        item: Document,
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

export const DocumentsDeleteRpc = Rpc.make("delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        txid: Schema.Number,
    }),
    error: Schema.Union([NotFoundError, DatabaseError]),
})

const PublicDocumentsRpcs = RpcGroup.make(
    DocumentsListBlogPostsRpc,
    DocumentsGetBySlugRpc
).middleware(ActiveDomainRpcMiddleware)

const AuthenticatedDocumentsRpcs = RpcGroup.make(
    DocumentsListRpc,
    DocumentsGetRpc,
    DocumentsCreateRpc,
    DocumentsUpdateRpc,
    DocumentsDeleteRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const DocumentsRpcs = PublicDocumentsRpcs.merge(
    AuthenticatedDocumentsRpcs
)
