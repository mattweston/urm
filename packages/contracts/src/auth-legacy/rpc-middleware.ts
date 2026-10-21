/**
 * # RPC Middleware
 *
 * Three middlewares provide a request context; two only require one others
 * provided. A requirer grants nothing and can never appear alone — it has no
 * way to learn who the caller is.
 *
 * Implemented in @urm/rpc. All five fail with AuthorizationError.
 */

import { Context } from "effect"
import { Headers } from "effect/unstable/http"
import { RpcMiddleware } from "effect/unstable/rpc"
import { AuthorizationError } from "@urm/domain/errors"
import { ContactId } from "@urm/domain/schemas/contacts"

export type AuthenticatedRpcRequestContext = {
    readonly requestId: string
    readonly contactId: ContactId
    readonly account_id?: string
    readonly headers: Headers.Headers
    readonly domainId?: string
    readonly hostname?: string
}

export type ActiveDomainRequest = {
    readonly domainId: string
    readonly hostname: string
}

export type PublicWorkerRpcRequest = {
    readonly hostname: string
}

export class ActiveDomainRequestContext extends Context.Service<
    ActiveDomainRequestContext,
    ActiveDomainRequest
>()("@urm/contracts/auth-legacy/ActiveDomainRequestContext") {}

export class PublicWorkerRequestContext extends Context.Service<
    PublicWorkerRequestContext,
    PublicWorkerRpcRequest
>()("@urm/contracts/auth-legacy/PublicWorkerRequestContext") {}

export class AuthenticatedRequestContext extends Context.Service<
    AuthenticatedRequestContext,
    AuthenticatedRpcRequestContext
>()("@urm/contracts/auth-legacy/AuthenticatedRequestContext") {}

export class AuthenticatedRpcMiddleware extends RpcMiddleware.Service<
    AuthenticatedRpcMiddleware,
    {
        provides: AuthenticatedRequestContext
    }
>()("@urm/contracts/auth-legacy/AuthenticatedRpcMiddleware", {
    error: AuthorizationError,
}) {}

export class ActiveDomainRpcMiddleware extends RpcMiddleware.Service<
    ActiveDomainRpcMiddleware,
    {
        provides: ActiveDomainRequestContext
    }
>()("@urm/contracts/auth-legacy/ActiveDomainRpcMiddleware", {
    error: AuthorizationError,
}) {}

export class PublicWorkerRpcMiddleware extends RpcMiddleware.Service<
    PublicWorkerRpcMiddleware,
    {
        provides: PublicWorkerRequestContext
    }
>()("@urm/contracts/auth-legacy/PublicWorkerRpcMiddleware", {
    error: AuthorizationError,
}) {}

export class DomainManagerRpcMiddleware extends RpcMiddleware.Service<
    DomainManagerRpcMiddleware,
    {
        requires: AuthenticatedRequestContext | ActiveDomainRequestContext
    }
>()("@urm/contracts/auth-legacy/DomainManagerRpcMiddleware", {
    error: AuthorizationError,
}) {}

export class PlatformAdminRpcMiddleware extends RpcMiddleware.Service<
    PlatformAdminRpcMiddleware,
    {
        requires: AuthenticatedRequestContext
    }
>()("@urm/contracts/auth-legacy/PlatformAdminRpcMiddleware", {
    error: AuthorizationError,
}) {}
