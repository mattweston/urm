import { RpcMiddleware } from "effect/rpc"
import { AuthorizationError } from "@urm/domain/errors"

export class AuthenticatedRpcMiddleware extends RpcMiddleware.Service<AuthenticatedRpcMiddleware>()(
    "@urm/contracts/auth/AuthenticatedRpcMiddleware",
    { error: AuthorizationError }
) {}

export {
    AccountProfile,
    AccountSession,
    AccountDomain,
    AccountDomains,
} from "./accounts.ts"
export { Breach, BreachCheckResult } from "./breaches.ts"
