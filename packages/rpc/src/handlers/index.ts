/**
 * # RPC handlers
 *
 * One directory per domain, each following the same shape:
 *
 * - `index.ts` re-exports the domain's contract (`<X>Rpcs` from
 *   `@urm/contracts/<x>`), the handler layer `<X>RpcLive`, and the
 *   repository layer `<X>RepositoryLive`.
 * - `handlers.ts` implements the contract; `repository.ts` implements the
 *   repository interface from `@urm/contracts/repositories/<x>`.
 *
 * The server wires everything together in `apps/server/src/rpc/layer.ts`:
 * it merges every `<X>RpcLive`, provides the repository layers, `DatabaseLive`,
 * and config layers. Handlers fail with the tagged errors declared in each
 * contract's per-route error union (see `@urm/domain/errors`).
 */
export {
    ChatRpcLive,
    ChatRpcHandlersTagLive,
    ChatRepositoryLive,
} from "./chat-bkup/index.ts"
export { ChatServer } from "./chat/index.ts"
export { ContactsServer, contacts_remote_handlers } from "./contacts/index.ts"
export { MembersServer, members_remote_handlers } from "./members/index.ts"
export { AuditRpcLive } from "./audit/index.ts"
export {
    AppActiveDomainRpcMiddleware,
    AppActiveDomainRpcMiddlewareLive,
    AppRpcAuthMiddleware,
    AppRpcAuthMiddlewareLive,
    DomainManagerRpcMiddleware,
    DomainManagerRpcMiddlewareLive,
    PlatformAdminRpcMiddleware,
    PlatformAdminRpcMiddlewareLive,
    PublicWorkerRpcMiddleware,
    PublicWorkerRpcMiddlewareLive,
    RpcAuthorizationPersistenceLive,
    AuthenticatedRequestContext,
    type AppRpcRequestContext,
} from "./middleware/index.js"
