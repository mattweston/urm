import {
    DB,
    expireDemoWorkspaces,
    makeDatabaseLiveFromUrl,
    makeMigratorLive,
    migrator,
    purgeExpiredDemoWorkspaces,
    provisionDemoWorkspace,
    resetDemoWorkspace,
    schema,
} from "@urm/database"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const test_database_url = process.env.DATABASE_URL_TEST

if (test_database_url === undefined || test_database_url.length === 0) {
    throw new Error(
        "DATABASE_URL_TEST is required for demo workspace integration tests"
    )
}

const database_test_live = makeDatabaseLiveFromUrl(
    test_database_url,
    "development"
)
const migrator_test_live = makeMigratorLive().pipe(
    Layer.provide(database_test_live)
)

const contact_id = "demo-workspace-contact"
const reset_contact_id = "demo-workspace-reset-contact"
const start = new Date("2026-07-25T12:00:00.000Z")

const clean_test_database = Effect.gen(function* () {
    const db = yield* DB
    yield* db.execute(sql`TRUNCATE TABLE "contacts", "orgs" CASCADE`)
})

const seed_test_contact = Effect.gen(function* () {
    const db = yield* DB
    yield* db.insert(schema.contacts).values([
        {
            id: contact_id,
            email: "demo-workspace@example.test",
            name: "Demo Workspace Contact",
            updated_at: Date.now(),
        },
        {
            id: reset_contact_id,
            email: "demo-workspace-reset@example.test",
            name: "Demo Workspace Reset Contact",
            updated_at: Date.now(),
        },
    ])
})

const provision = (now: Date) =>
    provisionDemoWorkspace(contact_id, now).pipe(
        Effect.provide(database_test_live)
    )

const reset = (now: Date) =>
    resetDemoWorkspace(reset_contact_id, now).pipe(
        Effect.provide(database_test_live)
    )

const provision_reset_contact = (now: Date) =>
    provisionDemoWorkspace(reset_contact_id, now).pipe(
        Effect.provide(database_test_live)
    )

beforeAll(async () => {
    await Effect.runPromise(migrator().pipe(Effect.provide(migrator_test_live)))
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
    await Effect.runPromise(
        seed_test_contact.pipe(Effect.provide(database_test_live))
    )
})

afterAll(async () => {
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
})

describe("demo workspace provisioning", () => {
    it("is idempotent under concurrent requests and grants only domain-owner access", async () => {
        const workspaces = await Effect.runPromise(
            Effect.all([provision(start), provision(start)], {
                concurrency: "unbounded",
            })
        )

        expect(workspaces[0].workspace_id).toBe(workspaces[1].workspace_id)
        expect(workspaces[0].domains).toHaveLength(3)
        expect(
            new Set(workspaces[0].domains.map((domain) => domain.domain_id))
                .size
        ).toBe(3)

        const results = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                const [workspace_rows, owner_rows, platform_admin_rows] =
                    yield* Effect.all([
                        db
                            .select()
                            .from(schema.demo_workspaces)
                            .where(
                                and(
                                    eq(
                                        schema.demo_workspaces.contact_id,
                                        contact_id
                                    ),
                                    eq(schema.demo_workspaces.status, "active")
                                )
                            ),
                        db
                            .select()
                            .from(schema.domain_admin)
                            .where(
                                and(
                                    eq(
                                        schema.domain_admin.contact_id,
                                        contact_id
                                    ),
                                    eq(schema.domain_admin.role, "owner"),
                                    eq(schema.domain_admin.status, "active"),
                                    isNull(schema.domain_admin.deleted_at)
                                )
                            ),
                        db
                            .select()
                            .from(schema.platform_admin)
                            .where(
                                and(
                                    eq(
                                        schema.platform_admin.contact_id,
                                        contact_id
                                    ),
                                    isNull(schema.platform_admin.deleted_at)
                                )
                            ),
                    ])

                return { workspace_rows, owner_rows, platform_admin_rows }
            }).pipe(Effect.provide(database_test_live))
        )

        expect(results.workspace_rows).toHaveLength(1)
        expect(results.owner_rows).toHaveLength(3)
        expect(results.platform_admin_rows).toHaveLength(0)
    })

    it("expires the prior workspace before provisioning a fresh isolated one", async () => {
        const original = await Effect.runPromise(provision(start))
        const next_week = new Date(start.getTime() + 8 * 24 * 60 * 60 * 1_000)
        const replacement = await Effect.runPromise(provision(next_week))

        expect(replacement.workspace_id).not.toBe(original.workspace_id)
        expect(
            new Set(replacement.domains.map((domain) => domain.domain_id))
        ).not.toEqual(
            new Set(original.domains.map((domain) => domain.domain_id))
        )

        const old_workspace = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                const rows = yield* db
                    .select({ status: schema.demo_workspaces.status })
                    .from(schema.demo_workspaces)
                    .where(eq(schema.demo_workspaces.id, original.workspace_id))
                    .limit(1)
                return rows[0]
            }).pipe(Effect.provide(database_test_live))
        )

        expect(old_workspace?.status).toBe("expired")
    })

    it("resets one workspace and purges every expired workspace without touching active ones", async () => {
        const original = await Effect.runPromise(provision_reset_contact(start))
        const replacement = await Effect.runPromise(
            reset(new Date(start.getTime() + 24 * 60 * 60 * 1_000))
        )
        const expiry_time = new Date(start.getTime() + 9 * 24 * 60 * 60 * 1_000)

        expect(replacement.workspace_id).not.toBe(original.workspace_id)

        const expired_count = await Effect.runPromise(
            expireDemoWorkspaces(expiry_time).pipe(
                Effect.provide(database_test_live)
            )
        )
        expect(expired_count).toBe(1)

        const before_purge = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                return yield* db
                    .select({ org_id: schema.demo_workspaces.org_id })
                    .from(schema.demo_workspaces)
                    .where(
                        eq(schema.demo_workspaces.contact_id, reset_contact_id)
                    )
            }).pipe(Effect.provide(database_test_live))
        )

        const purged_count = await Effect.runPromise(
            purgeExpiredDemoWorkspaces(
                new Date(start.getTime() + 11 * 24 * 60 * 60 * 1_000)
            ).pipe(Effect.provide(database_test_live))
        )
        expect(purged_count).toBe(3)

        const after_purge = await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                const [workspaces, organisations, contacts, active_workspaces] =
                    yield* Effect.all([
                        db
                            .select({ id: schema.demo_workspaces.id })
                            .from(schema.demo_workspaces)
                            .where(
                                eq(
                                    schema.demo_workspaces.contact_id,
                                    reset_contact_id
                                )
                            ),
                        db
                            .select({ id: schema.orgs.id })
                            .from(schema.orgs)
                            .where(
                                inArray(
                                    schema.orgs.id,
                                    before_purge.map(
                                        (workspace) => workspace.org_id
                                    )
                                )
                            ),
                        db
                            .select({ id: schema.contacts.id })
                            .from(schema.contacts)
                            .where(eq(schema.contacts.id, reset_contact_id)),
                        db
                            .select({ id: schema.demo_workspaces.id })
                            .from(schema.demo_workspaces)
                            .where(
                                and(
                                    eq(
                                        schema.demo_workspaces.contact_id,
                                        contact_id
                                    ),
                                    eq(schema.demo_workspaces.status, "active")
                                )
                            ),
                    ])

                return {
                    workspaces,
                    organisations,
                    contacts,
                    active_workspaces,
                }
            }).pipe(Effect.provide(database_test_live))
        )

        expect(after_purge.workspaces).toHaveLength(0)
        expect(after_purge.organisations).toHaveLength(0)
        expect(after_purge.contacts).toHaveLength(1)
        expect(after_purge.active_workspaces).toHaveLength(1)
    })
})
