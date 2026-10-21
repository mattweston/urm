/**
 * # CSRF RPC Util
 *
 * The header pair every RPC request carries, and the server-side check for it.
 */

// A custom request header is the whole defence: a cross-origin form post cannot
// set one without a passing CORS preflight, so its presence proves the request
// came from our own fetch code. The value is arbitrary — only the header's
// existence is load-bearing.
export const RPC_CSRF_HEADER_NAME = "x-requested-with"
export const RPC_CSRF_HEADER_VALUE = "XMLHttpRequest"

export const RPC_CSRF_HEADER = {
    [RPC_CSRF_HEADER_NAME]: RPC_CSRF_HEADER_VALUE,
} as const

export const hasRpcCsrfHeader = (request: Request): boolean =>
    request.headers.get(RPC_CSRF_HEADER_NAME) === RPC_CSRF_HEADER_VALUE
