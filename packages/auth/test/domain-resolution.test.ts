import { assert, describe, it } from "@effect/vitest"
import { AuthConfig } from "@urm/env/server"
import { Effect, Layer, Redacted } from "effect"
import { makeTrustedDomainScopeResolution } from "../src/domain-resolution.ts"

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

const handleTrustedDomainScopeResolution = makeTrustedDomainScopeResolution(
    () => Effect.die("Domain scope resolution must not run")
)

describe("trusted domain scope resolution", () => {
    it.effect(
        "rejects forged worker assertions before resolving the supplied host",
        () =>
            Effect.gen(function* () {
                const response = yield* handleTrustedDomainScopeResolution(
                    new Request("https://api.urm.dev/auth/domain/resolve", {
                        headers: {
                            "x-urm-domain-worker-token": "forged",
                            "x-urm-original-host": "urm.other-domain.urm.dev",
                        },
                    })
                )

                assert.strictEqual(response.status, 404)
                assert.strictEqual(
                    response.headers.get("Cache-Control"),
                    "no-store"
                )
            }).pipe(Effect.provide(AuthConfigTestLive))
    )

    it.effect("requires GET even when the worker token is valid", () =>
        Effect.gen(function* () {
            const response = yield* handleTrustedDomainScopeResolution(
                new Request("https://api.urm.dev/auth/domain/resolve", {
                    method: "POST",
                    headers: {
                        "x-urm-domain-worker-token": "worker-secret",
                        "x-urm-original-host": "urm.some-domain.urm.dev",
                    },
                })
            )

            assert.strictEqual(response.status, 404)
        }).pipe(Effect.provide(AuthConfigTestLive))
    )
})
