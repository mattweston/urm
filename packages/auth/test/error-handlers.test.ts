import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { authErrorToResponse } from "../src/error-handlers.ts"
import { ForbiddenError, UnauthorizedError } from "../src/permissions/types.ts"

describe("@urm/auth - Error Handlers", () => {
    it.effect("returns a complete missing-cookie response", () =>
        Effect.gen(function* () {
            const response = yield* authErrorToResponse(
                new UnauthorizedError({
                    message: "No auth cookie found",
                })
            )

            expect(response.status).toBe(401)
            expect(response.headers["content-type"]).toBe("application/json")
            if (response.body._tag !== "Uint8Array") {
                throw new Error("Expected a JSON response body")
            }
            expect(new TextDecoder().decode(response.body.body)).toBe(
                JSON.stringify({
                    error: "Unauthorized",
                    message: "No auth cookie found",
                    details:
                        "No authentication cookie found. Please login first.",
                    code: "AUTH_MISSING",
                })
            )
        })
    )

    it.effect("returns a complete invalid-token response", () =>
        Effect.gen(function* () {
            const response = yield* authErrorToResponse(
                new UnauthorizedError({
                    message: "Invalid or expired authentication token",
                })
            )

            expect(response.status).toBe(401)
            if (response.body._tag !== "Uint8Array") {
                throw new Error("Expected a JSON response body")
            }
            expect(new TextDecoder().decode(response.body.body)).toBe(
                JSON.stringify({
                    error: "Unauthorized",
                    message: "Invalid or expired authentication token",
                    details: "Invalid or expired authentication token.",
                    code: "AUTH_MISSING",
                })
            )
        })
    )

    it.effect("returns a complete forbidden response", () =>
        Effect.gen(function* () {
            const response = yield* authErrorToResponse(
                new ForbiddenError({
                    message:
                        "You don't have permission to access this resource",
                })
            )

            expect(response.status).toBe(403)
            if (response.body._tag !== "Uint8Array") {
                throw new Error("Expected a JSON response body")
            }
            expect(new TextDecoder().decode(response.body.body)).toBe(
                JSON.stringify({
                    error: "Forbidden",
                    message:
                        "You don't have permission to access this resource",
                    details:
                        "You don't have permission to access this resource.",
                    code: "AUTH_INSUFFICIENT",
                })
            )
        })
    )

    it.effect("does not expose details for unexpected errors", () =>
        Effect.gen(function* () {
            const response = yield* authErrorToResponse(
                new Error("Database unreachable")
            )

            expect(response.status).toBe(500)
            if (response.body._tag !== "Uint8Array") {
                throw new Error("Expected a JSON response body")
            }
            expect(new TextDecoder().decode(response.body.body)).toBe(
                JSON.stringify({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred",
                    details: "An unexpected error occurred",
                    code: "INTERNAL_ERROR",
                })
            )
        })
    )
})
