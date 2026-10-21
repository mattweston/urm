import {
    AuditEventPersistence,
    createContactAuthSession,
    revokeAuthSessionWithInfo,
} from "@urm/auth/legacy"
import {
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    PlatformAdminRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import {
    DB,
    makeDatabaseLiveFromUrl,
    makeMigratorLive,
    migrator,
    schema,
} from "@urm/db"
import { AuthorizationError } from "@urm/domain/errors"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import {
    AppRpcAuthMiddlewareLive,
    PlatformAdminRpcMiddlewareLive,
    RpcAuthorizationPersistenceLive,
} from "../src/handlers/middleware/index.ts"
import { Effect, Layer, ManagedRuntime, Redacted, Schema } from "effect"
import { Rpc, RpcGroup, RpcTest } from "effect/unstable/rpc"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const test_database_url = process.env.DATABASE_URL_TEST

if (test_database_url === undefined || test_database_url.length === 0) {
    throw new Error(
        "DATABASE_URL_TEST is required for RPC auth integration tests"
    )
}

const database_test_live = makeDatabaseLiveFromUrl(
    test_database_url,
    "development"
)
const migrator_test_live = makeMigratorLive().pipe(
    Layer.provide(database_test_live)
)

const AuthConfigTestLive = Layer.succeed(
    AuthConfig,
    AuthConfig.of({
        authSecret: Redacted.make("rpc-auth-session-test-secret"),
        demoCredentialsEnabled: false,
        googleClientId: "",
        googleClientSecret: Redacted.make(""),
        pwnedPasswordsEnabled: false,
        pwnedPasswordsFailClosed: false,
        pwnedPasswordsTimeoutMs: 1,
        pwnedPasswordsCacheTtlMs: 1,
        sessionInactivityTimeoutMs: 60_000,
        sessionAbsoluteMaxLifetimeMs: 60_000,
        recentAuthTimeoutMs: 60_000,
        domainWorkerToken: Redacted.make(""),
    })
)

const AuditEventPersistenceTestLive = Layer.succeed(
    AuditEventPersistence,
    AuditEventPersistence.of({ write: () => Effect.void })
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

const session_test_live = Layer.mergeAll(
    database_test_live,
    AuthConfigTestLive,
    ServerConfigTestLive,
    AuditEventPersistenceTestLive
)

const AuthenticatedProbeRpc = Rpc.make("rpc.authenticated-probe", {
    payload: Schema.Struct({}),
    success: Schema.String,
    error: AuthorizationError,
})

const AuthenticatedProbeRpcs = RpcGroup.make(AuthenticatedProbeRpc).middleware(
    AuthenticatedRpcMiddleware
)

const AuthenticatedProbeRpcLive = AuthenticatedProbeRpcs.toLayer(
    Effect.succeed(
        AuthenticatedProbeRpcs.of({
            "rpc.authenticated-probe": () =>
                Effect.gen(function* () {
                    const authenticated = yield* AuthenticatedRequestContext
                    return authenticated.contactId
                }),
        })
    )
)

const PlatformAdminProbeRpc = Rpc.make("rpc.platform-admin-probe", {
    payload: Schema.Struct({}),
    success: Schema.String,
    error: AuthorizationError,
})

const PlatformAdminProbeRpcs = RpcGroup.make(PlatformAdminProbeRpc)
    .middleware(PlatformAdminRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

const PlatformAdminProbeRpcLive = PlatformAdminProbeRpcs.toLayer(
    Effect.succeed(
        PlatformAdminProbeRpcs.of({
            "rpc.platform-admin-probe": () =>
                Effect.gen(function* () {
                    const authenticated = yield* AuthenticatedRequestContext
                    return authenticated.contactId
                }),
        })
    )
)

const contact_id = "contact-00000000-0000-4000-8000-000000000003"
const other_contact_id = "contact-00000000-0000-4000-8000-000000000004"

const clean_test_database = Effect.gen(function* () {
    const db = yield* DB
    yield* db.execute(sql`TRUNCATE TABLE "contacts" CASCADE`)
})

const cookie_from_set_cookie = (set_cookie: string): string => {
    const cookie = set_cookie.split(";")[0]

    if (cookie === undefined || cookie.length === 0) {
        throw new Error("Expected an auth cookie")
    }

    return cookie
}

const request_with_cookie = (cookie: string) =>
    new Request("https://api.urm.dev/api/rpc", { headers: { cookie } })

const make_runtime = () =>
    ManagedRuntime.make(
        Layer.merge(
            AuthenticatedProbeRpcLive,
            AppRpcAuthMiddlewareLive.pipe(Layer.provide(session_test_live))
        )
    )

const make_platform_admin_runtime = () =>
    ManagedRuntime.make(
        Layer.mergeAll(
            PlatformAdminProbeRpcLive,
            AppRpcAuthMiddlewareLive.pipe(Layer.provide(session_test_live)),
            PlatformAdminRpcMiddlewareLive.pipe(
                Layer.provide(
                    RpcAuthorizationPersistenceLive.pipe(
                        Layer.provide(database_test_live)
                    )
                )
            )
        )
    )

const call_probe = (cookie: string | undefined) =>
    Effect.gen(function* () {
        const client = yield* RpcTest.makeClient(AuthenticatedProbeRpcs)

        return cookie === undefined
            ? yield* client["rpc.authenticated-probe"]({})
            : yield* client["rpc.authenticated-probe"](
                  {},
                  { headers: { cookie } }
              )
    }).pipe(Effect.scoped)

const call_platform_admin_probe = (cookie: string) =>
    Effect.gen(function* () {
        const client = yield* RpcTest.makeClient(PlatformAdminProbeRpcs)
        return yield* client["rpc.platform-admin-probe"](
            {},
            { headers: { cookie } }
        )
    }).pipe(Effect.scoped)

beforeAll(async () => {
    await Effect.runPromise(migrator().pipe(Effect.provide(migrator_test_live)))
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
    await Effect.runPromise(
        Effect.gen(function* () {
            const db = yield* DB
            yield* db.insert(schema.contacts).values([
                {
                    id: contact_id,
                    name: "RPC Auth Integration Contact",
                    email: "rpc-auth-session@example.test",
                    updated_at: Date.now(),
                },
                {
                    id: other_contact_id,
                    name: "Other RPC Auth Integration Contact",
                    email: "other-rpc-auth-session@example.test",
                    updated_at: Date.now(),
                },
            ])
        }).pipe(Effect.provide(database_test_live))
    )
})

afterAll(async () => {
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
})

describe("RPC central session authentication", () => {
    it("rejects missing and revoked browser sessions", async () => {
        const runtime = make_runtime()

        await expect(runtime.runPromise(call_probe(undefined))).rejects.toThrow(
            "Authentication required"
        )

        const cookie = await Effect.runPromise(
            createContactAuthSession(
                contact_id,
                new Request("https://api.urm.dev/auth/login")
            ).pipe(
                Effect.map((session) => cookie_from_set_cookie(session.cookie)),
                Effect.provide(session_test_live)
            )
        )

        await expect(runtime.runPromise(call_probe(cookie))).resolves.toBe(
            contact_id
        )

        await Effect.runPromise(
            revokeAuthSessionWithInfo(request_with_cookie(cookie)).pipe(
                Effect.provide(session_test_live)
            )
        )

        await expect(runtime.runPromise(call_probe(cookie))).rejects.toThrow(
            "Authentication required"
        )
    })

    it("reloads platform authority after grant and revocation", async () => {
        const runtime = make_platform_admin_runtime()
        const cookie = await Effect.runPromise(
            createContactAuthSession(
                contact_id,
                new Request("https://api.urm.dev/auth/login")
            ).pipe(
                Effect.map((session) => cookie_from_set_cookie(session.cookie)),
                Effect.provide(session_test_live)
            )
        )

        await expect(
            runtime.runPromise(call_platform_admin_probe(cookie))
        ).rejects.toThrow("Not permitted")

        await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                yield* db.insert(schema.platform_admin).values({
                    contact_id,
                    role: "sysadmin",
                    status: "active",
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }).pipe(Effect.provide(database_test_live))
        )

        await expect(
            runtime.runPromise(call_platform_admin_probe(cookie))
        ).resolves.toBe(contact_id)

        const other_cookie = await Effect.runPromise(
            createContactAuthSession(
                other_contact_id,
                new Request("https://api.urm.dev/auth/login")
            ).pipe(
                Effect.map((session) => cookie_from_set_cookie(session.cookie)),
                Effect.provide(session_test_live)
            )
        )

        await expect(
            runtime.runPromise(call_platform_admin_probe(other_cookie))
        ).rejects.toThrow("Not permitted")

        await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                yield* db
                    .update(schema.platform_admin)
                    .set({
                        status: "suspended",
                        updated_at: new Date(),
                    })
                    .where(
                        sql`${schema.platform_admin.contact_id} = ${contact_id}`
                    )
            }).pipe(Effect.provide(database_test_live))
        )

        await expect(
            runtime.runPromise(call_platform_admin_probe(cookie))
        ).rejects.toThrow("Not permitted")
    })
})
