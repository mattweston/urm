import {
    AuditEventPersistence,
    createContactAuthSession,
    createDomainSession,
    getAuthSessionContactId,
    handleCentralDomainSelection,
    resolveDomainSessionScope,
    rotateAuthSession,
} from "@urm/auth/legacy"
import {
    DB,
    makeDatabaseLiveFromUrl,
    makeMigratorLive,
    migrator,
    provisionDemoWorkspace,
    schema,
} from "@urm/database"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { Effect, Layer, Redacted } from "effect"
import { eq, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const test_database_url = process.env.DATABASE_URL_TEST

if (test_database_url === undefined || test_database_url.length === 0) {
    throw new Error("DATABASE_URL_TEST is required for auth integration tests")
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
        authSecret: Redacted.make("session-rotation-test-secret"),
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
    AuditEventPersistenceTestLive,
    ServerConfigTestLive
)

const contact_id = "session-rotation-integration-contact"
const other_contact_id = "session-rotation-integration-other-contact"
const support_contact_id = "session-rotation-integration-support-contact"

const clean_test_database = Effect.gen(function* () {
    const db = yield* DB
    yield* db.execute(sql`TRUNCATE TABLE "contacts" CASCADE`)
})

const request_with_cookie = (cookie: string) =>
    new Request("https://api.urm.dev/auth/login", {
        headers: { cookie },
    })

const cookie_from_set_cookie = (set_cookie: string): string => {
    const cookie = set_cookie.split(";")[0]

    if (cookie === undefined || cookie.length === 0) {
        throw new Error("Expected an auth cookie")
    }

    return cookie
}

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
                    name: "Session Rotation Integration Contact",
                    email: "session-rotation@example.test",
                    updated_at: Date.now(),
                },
                {
                    id: other_contact_id,
                    name: "Other Demo Integration Contact",
                    email: "other-demo-session@example.test",
                    updated_at: Date.now(),
                },
                {
                    id: support_contact_id,
                    name: "Demo Support Integration Contact",
                    email: "demo-support-session@example.test",
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

describe("central auth session rotation", () => {
    it("hides central domain selection when no central session is present", async () => {
        const response = await Effect.runPromise(
            handleCentralDomainSelection(
                new Request("https://api.urm.dev/auth/domain/select", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id: "unavailable-domain" }),
                })
            ).pipe(Effect.provide(session_test_live))
        )

        expect(response.status).toBe(404)
        expect(response.headers.get("Cache-Control")).toBe("no-store")
    })

    it("invalidates the previous browser token while retaining the session identity", async () => {
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const created = yield* createContactAuthSession(
                    contact_id,
                    new Request("https://api.urm.dev/auth/login")
                )
                const original_cookie = cookie_from_set_cookie(created.cookie)
                const rotated = yield* rotateAuthSession(
                    request_with_cookie(original_cookie),
                    contact_id
                )

                if (rotated === undefined) {
                    return yield* Effect.die(
                        "Expected the session token to rotate"
                    )
                }

                const rotated_cookie = cookie_from_set_cookie(rotated.cookie)
                const original_contact_id = yield* getAuthSessionContactId(
                    request_with_cookie(original_cookie)
                )
                const rotated_contact_id = yield* getAuthSessionContactId(
                    request_with_cookie(rotated_cookie)
                )

                return {
                    original_contact_id,
                    rotated_contact_id,
                    created_session_id: created.session_id,
                    rotated_session_id: rotated.session_id,
                }
            }).pipe(Effect.provide(session_test_live))
        )

        expect(result.original_contact_id).toBeUndefined()
        expect(result.rotated_contact_id).toBe(contact_id)
        expect(result.rotated_session_id).toBe(result.created_session_id)
    })
})

describe("demo workspace domain sessions", () => {
    it("resolves only active demo workspace domains", async () => {
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const workspace = yield* provisionDemoWorkspace(contact_id)
                const domain = workspace.domains[0]

                if (domain === undefined) {
                    return yield* Effect.die("Expected a demo workspace domain")
                }

                const hostname = `urm.${domain.domain_name}.urm.dev`
                const active_scope = yield* resolveDomainSessionScope(hostname)

                if (active_scope === undefined) {
                    return yield* Effect.die(
                        "Expected active demo domain scope"
                    )
                }

                const foreign_session = yield* createDomainSession(
                    other_contact_id,
                    active_scope,
                    new Headers()
                )
                const db = yield* DB

                yield* db.insert(schema.platform_admin).values({
                    contact_id: support_contact_id,
                    role: "sysadmin",
                    status: "active",
                })
                const support_session = yield* createDomainSession(
                    support_contact_id,
                    active_scope,
                    new Headers()
                )

                yield* db
                    .update(schema.demo_workspaces)
                    .set({
                        status: "expired",
                        updated_at: new Date(),
                    })
                    .where(
                        eq(schema.demo_workspaces.id, workspace.workspace_id)
                    )

                const expired_scope = yield* resolveDomainSessionScope(hostname)

                return {
                    active_scope,
                    domain,
                    expired_scope,
                    foreign_session,
                    support_session,
                }
            }).pipe(Effect.provide(session_test_live))
        )

        expect(result.active_scope).toEqual({
            domain_id: result.domain.domain_id,
            hostname: `urm.${result.domain.domain_name}.urm.dev`,
            cookie_domain: `${result.domain.domain_name}.urm.dev`,
        })
        expect(result.foreign_session).toBeUndefined()
        expect(result.support_session).toBeUndefined()
        expect(result.expired_scope).toBeUndefined()
    })
})
