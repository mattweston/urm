import { assert, describe, it } from "@effect/vitest"
import { AuthConfig } from "@urm/env/server"
import { Effect, Layer, Redacted, Ref } from "effect"
import { makeTrustedPublicDomainImageRoute } from "../src/http/uploads.ts"

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

describe("public domain image routes", () => {
    it.effect(
        "does not resolve a caller-supplied hostname with a forged worker token",
        () =>
            Effect.gen(function* () {
                const handle = makeTrustedPublicDomainImageRoute(
                    "product_id",
                    () => Effect.die("Domain scope resolution must not run"),
                    () => Effect.die("Image lookup must not run")
                )
                const response = yield* handle(
                    new Request(
                        "https://api.urm.dev/product-image?product_id=product-b",
                        {
                            headers: {
                                "x-urm-domain-worker-token": "forged",
                                "x-urm-original-host": "domain-a.urm.dev",
                            },
                        }
                    )
                )

                assert.strictEqual(response.status, 404)
                assert.strictEqual(
                    response.headers.get("Cache-Control"),
                    "no-store"
                )
            }).pipe(Effect.provide(AuthConfigTestLive))
    )

    it.effect(
        "looks up a foreign resource ID only within the resolved domain",
        () =>
            Effect.gen(function* () {
                const lookups = yield* Ref.make<
                    ReadonlyArray<
                        Readonly<{
                            domain_id: string
                            product_id: string
                        }>
                    >
                >([])
                const handle = makeTrustedPublicDomainImageRoute(
                    "product_id",
                    () => Effect.succeed({ domain_id: "domain-a" }),
                    (domain_id, product_id) =>
                        Ref.update(lookups, (values) => [
                            ...values,
                            { domain_id, product_id },
                        ]).pipe(Effect.as(undefined))
                )
                const response = yield* handle(
                    new Request(
                        "https://api.urm.dev/product-image?product_id=product-from-domain-b",
                        {
                            headers: {
                                "x-urm-domain-worker-token": "worker-secret",
                                "x-urm-original-host": "domain-a.urm.dev",
                            },
                        }
                    )
                )

                assert.strictEqual(response.status, 404)
                assert.deepStrictEqual(yield* Ref.get(lookups), [
                    {
                        domain_id: "domain-a",
                        product_id: "product-from-domain-b",
                    },
                ])
            }).pipe(Effect.provide(AuthConfigTestLive))
    )
})
