import { Effect, Layer, ManagedRuntime, Redacted, Ref, Schema } from "effect"
import { Rpc, RpcClient, RpcGroup, RpcTest } from "effect/unstable/rpc"
import { describe, expect, it } from "vitest"
import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
    PlatformAdminRpcMiddleware,
    PublicWorkerRequestContext,
    PublicWorkerRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { AuthorizationError } from "@urm/domain/errors"
import { ContactId } from "@urm/domain/schemas/contacts"
import { AuthConfig } from "@urm/env/server"
import {
    DomainManagerRpcMiddlewareLive,
    PlatformAdminRpcMiddlewareLive,
    PublicWorkerRpcMiddlewareLive,
    RpcAuthorizationPersistence,
} from "../src/handlers/middleware/index.ts"

const contact_id = Schema.decodeUnknownSync(ContactId)(
    "contact-00000000-0000-4000-8000-000000000001"
)
const domain_id = "domain-00000000-0000-4000-8000-000000000001"

const DomainProtectedRpc = Rpc.make("authorization.domain", {
    payload: Schema.Struct({}),
    success: Schema.Literal("ok"),
    error: AuthorizationError,
})

const PlatformProtectedRpc = Rpc.make("authorization.platform", {
    payload: Schema.Struct({}),
    success: Schema.Literal("ok"),
    error: AuthorizationError,
})

const PublicWorkerProtectedRpc = Rpc.make("authorization.public-worker", {
    payload: Schema.Struct({}),
    success: Schema.String,
    error: AuthorizationError,
})

const DomainProtectedRpcs = RpcGroup.make(DomainProtectedRpc)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const PlatformProtectedRpcs = RpcGroup.make(PlatformProtectedRpc)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const PublicWorkerProtectedRpcs = RpcGroup.make(
    PublicWorkerProtectedRpc
).middleware(PublicWorkerRpcMiddleware)

const DomainProtectedRpcLive = DomainProtectedRpcs.toLayer(
    Effect.succeed(
        DomainProtectedRpcs.of({
            "authorization.domain": () => Effect.succeed("ok"),
        })
    )
)

const PlatformProtectedRpcLive = PlatformProtectedRpcs.toLayer(
    Effect.succeed(
        PlatformProtectedRpcs.of({
            "authorization.platform": () => Effect.succeed("ok"),
        })
    )
)

const PublicWorkerProtectedRpcLive = PublicWorkerProtectedRpcs.toLayer(
    Effect.succeed(
        PublicWorkerProtectedRpcs.of({
            "authorization.public-worker": () =>
                Effect.gen(function* () {
                    const context = yield* PublicWorkerRequestContext
                    return context.hostname
                }),
        })
    )
)

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

const AuthenticatedRpcMiddlewareTestLive = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "test-request",
            contactId: contact_id,
            headers: options.headers,
        })
    )
)

const ActiveDomainRpcMiddlewareTestLive = Layer.succeed(
    ActiveDomainRpcMiddleware,
    ActiveDomainRpcMiddleware.of((effect) =>
        Effect.provideService(effect, ActiveDomainRequestContext, {
            domainId: domain_id,
            hostname: "test.localhost",
        })
    )
)

type AuthorityState = {
    readonly domain_manager: boolean
    readonly platform_admin: boolean
}

const makeRuntime = async () => {
    const state = await Effect.runPromise(
        Ref.make<AuthorityState>({
            domain_manager: false,
            platform_admin: false,
        })
    )
    const authorizationPersistenceTestLive = Layer.succeed(
        RpcAuthorizationPersistence,
        RpcAuthorizationPersistence.of({
            isDomainManager: () =>
                Ref.get(state).pipe(
                    Effect.map((value) => value.domain_manager)
                ),
            isPlatformAdmin: () =>
                Ref.get(state).pipe(
                    Effect.map((value) => value.platform_admin)
                ),
        })
    )
    const runtime = ManagedRuntime.make(
        Layer.mergeAll(
            DomainProtectedRpcLive,
            PlatformProtectedRpcLive,
            PublicWorkerProtectedRpcLive,
            AuthenticatedRpcMiddlewareTestLive,
            ActiveDomainRpcMiddlewareTestLive,
            DomainManagerRpcMiddlewareLive.pipe(
                Layer.provide(authorizationPersistenceTestLive)
            ),
            PlatformAdminRpcMiddlewareLive.pipe(
                Layer.provide(authorizationPersistenceTestLive)
            ),
            PublicWorkerRpcMiddlewareLive.pipe(
                Layer.provide(AuthConfigTestLive)
            )
        )
    )

    return { runtime, state }
}

describe("privileged RPC authority", () => {
    it("reloads the domain-manager role for every request", async () => {
        const { runtime, state } = await makeRuntime()

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client =
                        yield* RpcTest.makeClient(DomainProtectedRpcs)
                    return yield* client["authorization.domain"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Not permitted")

        await Effect.runPromise(
            Ref.set(state, { domain_manager: true, platform_admin: false })
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client =
                        yield* RpcTest.makeClient(DomainProtectedRpcs)
                    return yield* client["authorization.domain"]({})
                }).pipe(Effect.scoped)
            )
        ).resolves.toBe("ok")

        await Effect.runPromise(
            Ref.set(state, { domain_manager: false, platform_admin: false })
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client =
                        yield* RpcTest.makeClient(DomainProtectedRpcs)
                    return yield* client["authorization.domain"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Not permitted")
    })

    it("reloads the platform-admin role for every request", async () => {
        const { runtime, state } = await makeRuntime()

        await Effect.runPromise(
            Ref.set(state, { domain_manager: false, platform_admin: true })
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(
                        PlatformProtectedRpcs
                    )
                    return yield* client["authorization.platform"]({})
                }).pipe(Effect.scoped)
            )
        ).resolves.toBe("ok")

        await Effect.runPromise(
            Ref.set(state, { domain_manager: false, platform_admin: false })
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(
                        PlatformProtectedRpcs
                    )
                    return yield* client["authorization.platform"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Not permitted")
    })

    it("accepts public requests only from the trusted domain worker", async () => {
        const { runtime } = await makeRuntime()

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(
                        PublicWorkerProtectedRpcs
                    )
                    return yield* client["authorization.public-worker"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Trusted public worker required")

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(
                        PublicWorkerProtectedRpcs
                    )
                    return yield* client["authorization.public-worker"]({})
                }).pipe(
                    Effect.scoped,
                    RpcClient.withHeaders({
                        "x-urm-domain-worker-token": "worker-secret",
                        "x-urm-original-host": "TEST.localhost:4321",
                    })
                )
            )
        ).resolves.toBe("test.localhost")
    })
})
