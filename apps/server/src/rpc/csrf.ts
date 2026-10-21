import { hasRpcCsrfHeader } from "@urm/utils"

const csrf_protected_auth_paths: ReadonlyArray<string> = [
    "/auth/login",
    "/auth/sign-up",
    "/auth/logout",
    "/auth/email-verification/request",
    "/auth/email-verification/confirm",
    "/auth/password-reset/request",
    "/auth/password-reset/confirm",
    "/auth/sessions/revoke-others",
    "/auth/password/change",
    "/auth/email/change/request",
    "/auth/email/change/confirm",
    "/auth/domain/select",
    "/auth/domains/create",
    "/auth/domains/update",
    "/auth/domains/delete",
]

export const shouldRejectRpcRequest = (request: Request): boolean =>
    request.method === "POST" && !hasRpcCsrfHeader(request)

/**
 * Browser-originated auth mutations need the same explicit request header as
 * RPC. SameSite cookies do not protect the central host from a malicious
 * tenant subdomain, while the worker handoff has its own trusted assertion.
 */
export const shouldRejectAuthMutationRequest = (request: Request): boolean =>
    request.method === "POST" &&
    csrf_protected_auth_paths.includes(new URL(request.url).pathname) &&
    !hasRpcCsrfHeader(request)
