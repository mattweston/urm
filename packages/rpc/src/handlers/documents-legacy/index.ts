/**
 * # Documents RPC
 */

export {
    DocumentsRpcs,
    DocumentsListRpc,
    DocumentsListBlogPostsRpc,
    DocumentsGetRpc,
    DocumentsGetBySlugRpc,
    DocumentsCreateRpc,
    DocumentsUpdateRpc,
    DocumentsDeleteRpc,
} from "@urm/contracts/documents-legacy"

export { DocumentsRpcLive, DocumentsRpcHandlersTagLive } from "./handlers.ts"
export { DocumentsRpcHandlersTag } from "./model.ts"

export { DocumentsRepository } from "@urm/contracts/repositories/documents"
export { DocumentsRepositoryLive } from "./repository.ts"

export type { DocumentsRpcHandlers } from "./model.ts"
