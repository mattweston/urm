/**
 * # Issues RPC Index
 */

export type { IssueType, IssueLabelType } from "./handlers.js"

export {
    IssuesRpcs,
    IssuesListRpc,
    IssuesGetRpc,
    IssuesCreateRpc,
    IssuesUpdateRpc,
    IssuesDeleteRpc,
    IssueLabelsRpcs,
    IssueLabelsListRpc,
    IssueLabelsGetRpc,
    IssueLabelsCreateRpc,
    IssueLabelsUpdateRpc,
    IssueLabelsDeleteRpc,
} from "@urm/contracts/issues"

export {
    IssuesRpcLive,
    IssuesRpcHandlersTagLive,
    IssueLabelsRpcLive,
    IssueLabelsRpcHandlersTagLive,
} from "./handlers.js"

export {
    IssuesRepositoryLive,
    IssueLabelsRepositoryLive,
} from "./repository.js"
export {
    IssuesRepository,
    IssueLabelsRepository,
} from "@urm/contracts/repositories/issues"

export {
    IssuesServer,
    IssuesLibraryRepository,
    IssuesLibraryRepositoryLive,
} from "./remote.ts"
