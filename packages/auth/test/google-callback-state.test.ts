import { assert, describe, it } from "@effect/vitest"
import {
    AuditEventPersistence,
    consumeOAuthState,
    createOAuthState,
    encodePkce,
    GOOGLE_OAUTH_COOKIE,
    ObservabilityLogPersistence,
} from "@urm/auth/legacy"
import { ServerConfig } from "@urm/env/server"
import { Effect, Layer } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { validateGoogleCallbackState } from "../src/oauth/google-handlers.ts"
import { AuthPersistenceTestLive } from "./auth-persistence-test-layer.ts"

const ServerConfigTestLive = Layer.succeed(
    ServerConfig,
    ServerConfig.of({
        port: 1234,
        hostname: "localhost",
        apiUrl: "https://api.urm.dev",
        appUrl: "https://urm.dev",
        adminAppUrl: "https://admin.urm.dev",
        marketingAppUrl: "https://urm.dev",
        cookieDomain: "",
    })
)

const AuditEventPersistenceTestLive = Layer.succeed(
    AuditEventPersistence,
    AuditEventPersistence.of({ write: () => Effect.void })
)

const ObservabilityLogPersistenceTestLive = Layer.succeed(
    ObservabilityLogPersistence,
    ObservabilityLogPersistence.of({
        write: () => Effect.void,
        writeMany: () => Effect.void,
    })
)

const GoogleCallbackStateTestLive = Layer.mergeAll(
    AuthPersistenceTestLive,
    ServerConfigTestLive,
    AuditEventPersistenceTestLive,
    ObservabilityLogPersistenceTestLive
)

const callbackRequest = (
    state: string,
    cookie_state: string,
    verifier: string
) =>
    HttpServerRequest.fromWeb(
        new Request(
            `https://api.urm.dev/auth/google/callback?code=unused-code&state=${state}`,
            {
                headers: {
                    cookie: `${GOOGLE_OAUTH_COOKIE}=${encodePkce(cookie_state, verifier)}`,
                },
            }
        )
    )

describe("Google OAuth callback state", () => {
    it.effect("rejects state that differs from the PKCE cookie", () =>
        Effect.gen(function* () {
            const request = callbackRequest(
                "forged-state",
                "stored-state",
                "callback-verifier"
            )
            const result = yield* validateGoogleCallbackState.pipe(
                Effect.provideService(
                    HttpServerRequest.HttpServerRequest,
                    request
                )
            )

            if (result._tag !== "failure") {
                throw new Error("Expected an OAuth callback state failure")
            }

            const response = HttpServerResponse.toWeb(result.response)

            assert.strictEqual(response.status, 302)
            assert.strictEqual(
                response.headers.get("Location"),
                "https://urm.dev?auth_error=invalid_state"
            )
            assert.match(
                response.headers.get("Set-Cookie") ?? "",
                /^google_oauth_pkce=;/
            )
        }).pipe(Effect.provide(GoogleCallbackStateTestLive))
    )

    it.effect("rejects a replayed state before a provider exchange", () =>
        Effect.gen(function* () {
            const state = "replayed-callback-state"
            const verifier = "replayed-callback-verifier"
            yield* createOAuthState("google", state, verifier)
            yield* consumeOAuthState("google", state, verifier)
            const request = callbackRequest(state, state, verifier)
            const result = yield* validateGoogleCallbackState.pipe(
                Effect.provideService(
                    HttpServerRequest.HttpServerRequest,
                    request
                )
            )

            if (result._tag !== "failure") {
                throw new Error("Expected an OAuth callback state failure")
            }

            const response = HttpServerResponse.toWeb(result.response)

            assert.strictEqual(response.status, 302)
            assert.strictEqual(
                response.headers.get("Location"),
                "https://urm.dev?auth_error=invalid_state"
            )
            assert.match(
                response.headers.get("Set-Cookie") ?? "",
                /^google_oauth_pkce=;/
            )
        }).pipe(Effect.provide(GoogleCallbackStateTestLive))
    )
})
