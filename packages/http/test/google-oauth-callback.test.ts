import { assert, describe, it } from "@effect/vitest"
import {
    AuditEventPersistence,
    consumeOAuthState,
    createOAuthState,
    encodePkce,
    GOOGLE_OAUTH_COOKIE,
    ObservabilityLogPersistence,
} from "@urm/auth/legacy"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { Effect, Layer, Redacted } from "effect"
import { AuthPersistenceTestLive } from "../../auth/test/auth-persistence-test-layer.ts"
import { handleGoogleAuthRequest } from "../src/google-auth-web-handler.ts"

const AuthConfigTestLive = Layer.succeed(
    AuthConfig,
    AuthConfig.of({
        authSecret: Redacted.make("test-secret"),
        demoCredentialsEnabled: false,
        googleClientId: "",
        googleClientSecret: Redacted.make(""),
        pwnedPasswordsEnabled: false,
        pwnedPasswordsFailClosed: false,
        pwnedPasswordsTimeoutMs: 1,
        pwnedPasswordsCacheTtlMs: 1,
        sessionInactivityTimeoutMs: 1,
        sessionAbsoluteMaxLifetimeMs: 1,
        recentAuthTimeoutMs: 1,
        domainWorkerToken: Redacted.make("worker-secret"),
    })
)

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

const GoogleOAuthCallbackTestLive = Layer.mergeAll(
    AuthPersistenceTestLive,
    AuthConfigTestLive,
    ServerConfigTestLive,
    AuditEventPersistenceTestLive,
    ObservabilityLogPersistenceTestLive
)

const callbackRequest = (
    state: string,
    cookie_state: string,
    verifier: string
) =>
    new Request(
        `https://api.urm.dev/auth/google/callback?code=unused-code&state=${state}`,
        {
            headers: {
                cookie: `${GOOGLE_OAUTH_COOKIE}=${encodePkce(cookie_state, verifier)}`,
            },
        }
    )

describe("GET /auth/google/callback", () => {
    it.effect(
        "rejects an invalid callback method before reading OAuth state",
        () =>
            Effect.gen(function* () {
                const response = yield* handleGoogleAuthRequest(
                    new Request("https://api.urm.dev/auth/google/callback", {
                        method: "POST",
                    })
                )

                assert.strictEqual(response.status, 404)
            }).pipe(Effect.provide(GoogleOAuthCallbackTestLive))
    )

    it.effect(
        "returns an allowlisted failure redirect for a PKCE-state mismatch",
        () =>
            Effect.gen(function* () {
                const response = yield* handleGoogleAuthRequest(
                    callbackRequest(
                        "forged-state",
                        "stored-state",
                        "callback-verifier"
                    )
                )

                assert.strictEqual(response.status, 302)
                assert.strictEqual(
                    response.headers.get("Location"),
                    "https://urm.dev?auth_error=invalid_state"
                )
                assert.match(
                    response.headers.get("Set-Cookie") ?? "",
                    /^google_oauth_pkce=;/
                )
            }).pipe(Effect.provide(GoogleOAuthCallbackTestLive))
    )

    it.effect(
        "returns an allowlisted failure redirect for a replayed state",
        () =>
            Effect.gen(function* () {
                const state = "replayed-callback-state"
                const verifier = "replayed-callback-verifier"
                yield* createOAuthState("google", state, verifier)
                yield* consumeOAuthState("google", state, verifier)

                const response = yield* handleGoogleAuthRequest(
                    callbackRequest(state, state, verifier)
                )

                assert.strictEqual(response.status, 302)
                assert.strictEqual(
                    response.headers.get("Location"),
                    "https://urm.dev?auth_error=invalid_state"
                )
                assert.match(
                    response.headers.get("Set-Cookie") ?? "",
                    /^google_oauth_pkce=;/
                )
            }).pipe(Effect.provide(GoogleOAuthCallbackTestLive))
    )
})
