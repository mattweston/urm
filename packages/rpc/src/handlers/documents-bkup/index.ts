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

export { DocumentsRpcLive, DocumentsRpcHandlersTagLive } from "./handlers.js"
export { DocumentsRpcHandlersTag } from "./model.js"

export { DocumentsRepository } from "@urm/contracts/repositories/documents"
export { DocumentsRepositoryLive } from "./repository.js"

export type { DocumentsRpcHandlers } from "./model.js"
