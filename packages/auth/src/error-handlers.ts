/**
 * # Auth Error Handlers
 *
 * Maps UnauthorizedError/ForbiddenError to JSON HTTP responses.
 */
import { HttpServerResponse } from "effect/unstable/http"
import { UnauthorizedError, ForbiddenError } from "./permissions/types.ts"

export interface ErrorResponse {
    error: string
    message: string
    details: string
    code: string
}

export const authErrorToResponse = (error: unknown) => {
    if (error instanceof UnauthorizedError) {
        return HttpServerResponse.json(
            {
                error: "Unauthorized",
                message: error.message,
                // Brittle: rewording the message where the error is raised
                // silently changes the advice shown. Clients must branch on
                // `code`, never on `details`.
                details: error.message.includes("cookie")
                    ? "No authentication cookie found. Please login first."
                    : "Invalid or expired authentication token.",
                code: "AUTH_MISSING",
            } satisfies ErrorResponse,
            { status: 401 }
        )
    }
    if (error instanceof ForbiddenError) {
        return HttpServerResponse.json(
            {
                error: "Forbidden",
                message: error.message,
                details: "You don't have permission to access this resource.",
                code: "AUTH_INSUFFICIENT",
            } satisfies ErrorResponse,
            { status: 403 }
        )
    }
    // The original error is deliberately not included: an unexpected failure
    // can carry a connection string or stack trace, and there is no way here to
    // tell a safe one from a dangerous one.
    return HttpServerResponse.json(
        {
            error: "Internal Server Error",
            message: "An unexpected error occurred",
            details: "An unexpected error occurred",
            code: "INTERNAL_ERROR",
        } satisfies ErrorResponse,
        { status: 500 }
    )
}
