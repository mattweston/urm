/**
 * Provisions isolated, disposable demo workspaces in the demo database.
 *
 * The caller must already have a contact in that database. This operation
 * creates no platform-admin role and grants the contact access only to its own
 * three scenario domains.
 */

import { and, eq, gt, inArray, isNull, lt, lte, sql } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { randomUUID } from "node:crypto"
import { contacts } from "../legacy-schema/contacts/index.ts"
import {
    demo_workspace_domains,
    demo_workspaces,
} from "../legacy-schema/demo-workspaces/index.ts"
import {
    domain_admin,
    domain_contacts,
    domains,
} from "../legacy-schema/domains/index.ts"
import { org_contacts, orgs } from "../legacy-schema/organisations/index.ts"
import { DB } from "./database-service.ts"

export type DemoWorkspaceScenario = "marketing" | "shop" | "workspace"

export const demo_workspace_scenarios: ReadonlyArray<DemoWorkspaceScenario> = [
    "marketing",
    "shop",
    "workspace",
]

const isDemoWorkspaceScenario = (
    value: string
): value is DemoWorkspaceScenario =>
    value === "marketing" || value === "shop" || value === "workspace"

export const demo_workspace_lifetime_ms = 7 * 24 * 60 * 60 * 1_000
export const demo_workspace_expired_retention_ms = 24 * 60 * 60 * 1_000

export type DemoWorkspaceProvisionOptions = Readonly<{
    replace_active: boolean
}>

export interface ProvisionedDemoWorkspace {
    readonly workspace_id: string
    readonly expires_at: Date
    readonly domains: ReadonlyArray<{
        readonly scenario: DemoWorkspaceScenario
        readonly domain_id: string
        readonly domain_name: string
    }>
}

export interface DemoWorkspaceProvisioningType {
    readonly provision: (
        contact_id: string
    ) => Effect.Effect<
        ProvisionedDemoWorkspace,
        DemoWorkspaceProvisioningError,
        never
    >
}

export class DemoWorkspaceProvisioningError extends Schema.TaggedError<DemoWorkspaceProvisioningError>()(
    "DemoWorkspaceProvisioningError",
    {
        operation: Schema.String,
        reason: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {
    override get message(): string {
        return `${this.operation}: ${this.reason}`
    }
}

export class DemoWorkspaceProvisioning extends Context.Service<
    DemoWorkspaceProvisioning,
    DemoWorkspaceProvisioningType
>()("DemoWorkspaceProvisioning") {}

const provisioningError = (
    operation: string,
    reason: string,
    cause?: unknown
): DemoWorkspaceProvisioningError =>
    cause === undefined
        ? new DemoWorkspaceProvisioningError({ operation, reason })
        : new DemoWorkspaceProvisioningError({ operation, reason, cause })

const toProvisioningError = (cause: unknown): DemoWorkspaceProvisioningError =>
    provisioningError(
        "DemoWorkspaceProvisioning.database",
        "Database operation failed",
        cause
    )

const domainNameForScenario = (
    scenario: DemoWorkspaceScenario,
    workspace_id: string
): string => `demo-${scenario}-${workspace_id.replaceAll("-", "")}`

const workspaceSlug = (workspace_id: string): string =>
    `demo-${workspace_id.replaceAll("-", "")}`

const workspaceResult = (
    workspace_id: string,
    expires_at: Date,
    scenario_domains: ReadonlyArray<{
        readonly scenario: DemoWorkspaceScenario
        readonly domain_id: string
        readonly domain_name: string
    }>
): ProvisionedDemoWorkspace => ({
    workspace_id,
    expires_at,
    domains: scenario_domains,
})

/**
 * Creates or returns the caller's active demo workspace.
 *
 * The advisory transaction lock serializes concurrent requests for a contact;
 * the partial unique index is the final database guarantee.
 */
export const provisionDemoWorkspace = Effect.fn("DemoWorkspace.provision")(
    function* (
        contact_id: string,
        now = new Date(),
        options: DemoWorkspaceProvisionOptions = { replace_active: false }
    ) {
        const db = yield* DB
        const expires_at = new Date(now.getTime() + demo_workspace_lifetime_ms)

        return yield* db.transaction((tx) =>
            Effect.gen(function* () {
                yield* tx.execute(sql`
                    SELECT pg_advisory_xact_lock(hashtext(${contact_id}))
                `)

                const active_workspaces = yield* tx
                    .select()
                    .from(demo_workspaces)
                    .where(
                        and(
                            eq(demo_workspaces.contact_id, contact_id),
                            eq(demo_workspaces.status, "active"),
                            gt(demo_workspaces.expires_at, now)
                        )
                    )
                    .limit(1)
                const existing_active = active_workspaces[0]

                if (existing_active !== undefined && !options.replace_active) {
                    const existing_domains = yield* tx
                        .select({
                            scenario: demo_workspace_domains.scenario,
                            domain_id: domains.id,
                            domain_name: domains.name,
                        })
                        .from(demo_workspace_domains)
                        .innerJoin(
                            domains,
                            eq(demo_workspace_domains.domain_id, domains.id)
                        )
                        .where(
                            eq(
                                demo_workspace_domains.workspace_id,
                                existing_active.id
                            )
                        )

                    const scenario_domains: Array<{
                        scenario: DemoWorkspaceScenario
                        domain_id: string
                        domain_name: string
                    }> = []

                    for (const domain of existing_domains) {
                        if (!isDemoWorkspaceScenario(domain.scenario)) {
                            return yield* Effect.fail(
                                provisioningError(
                                    "DemoWorkspaceProvisioning.readActive",
                                    "Demo workspace has an invalid scenario"
                                )
                            )
                        }

                        scenario_domains.push({
                            scenario: domain.scenario,
                            domain_id: domain.domain_id,
                            domain_name: domain.domain_name,
                        })
                    }

                    return workspaceResult(
                        existing_active.id,
                        existing_active.expires_at,
                        scenario_domains
                    )
                }

                yield* tx
                    .update(demo_workspaces)
                    .set({ status: "expired", updated_at: now })
                    .where(
                        and(
                            eq(demo_workspaces.contact_id, contact_id),
                            eq(demo_workspaces.status, "active")
                        )
                    )

                const active_contacts = yield* tx
                    .select({ id: contacts.id })
                    .from(contacts)
                    .where(
                        and(
                            eq(contacts.id, contact_id),
                            isNull(contacts.deleted_at)
                        )
                    )
                    .limit(1)

                if (active_contacts[0] === undefined) {
                    return yield* Effect.fail(
                        provisioningError(
                            "DemoWorkspaceProvisioning.provision",
                            "Demo contact is not active"
                        )
                    )
                }

                const workspace_id = randomUUID()
                const organisation_rows = yield* tx
                    .insert(orgs)
                    .values({
                        name: "Demo workspace",
                        slug: workspaceSlug(workspace_id),
                        kind: "demo",
                        max_domains: demo_workspace_scenarios.length,
                    })
                    .returning()
                const organisation = organisation_rows[0]

                if (organisation === undefined) {
                    return yield* Effect.fail(
                        provisioningError(
                            "DemoWorkspaceProvisioning.createOrganisation",
                            "Failed to create demo organisation"
                        )
                    )
                }

                const workspace_rows = yield* tx
                    .insert(demo_workspaces)
                    .values({
                        id: workspace_id,
                        contact_id,
                        org_id: organisation.id,
                        status: "active",
                        expires_at,
                    })
                    .returning()
                const workspace = workspace_rows[0]

                if (workspace === undefined) {
                    return yield* Effect.fail(
                        provisioningError(
                            "DemoWorkspaceProvisioning.createWorkspace",
                            "Failed to create demo workspace"
                        )
                    )
                }

                yield* tx.insert(org_contacts).values({
                    org_id: organisation.id,
                    contact_id,
                    role: "owner",
                    status: "active",
                })

                const scenario_domains: Array<{
                    scenario: DemoWorkspaceScenario
                    domain_id: string
                    domain_name: string
                }> = []

                for (const scenario of demo_workspace_scenarios) {
                    const domain_name = domainNameForScenario(
                        scenario,
                        workspace.id
                    )
                    const domain_rows = yield* tx
                        .insert(domains)
                        .values({
                            org_id: organisation.id,
                            name: domain_name,
                            created_by_contact_id: contact_id,
                        })
                        .returning()
                    const domain = domain_rows[0]

                    if (domain === undefined) {
                        return yield* Effect.fail(
                            provisioningError(
                                "DemoWorkspaceProvisioning.createDomain",
                                "Failed to create demo domain"
                            )
                        )
                    }

                    yield* tx.insert(domain_contacts).values({
                        domain_id: domain.id,
                        contact_id,
                        status: "active",
                        source: "demo_workspace",
                    })
                    yield* tx.insert(domain_admin).values({
                        domain_id: domain.id,
                        contact_id,
                        role: "owner",
                        status: "active",
                    })
                    yield* tx.insert(demo_workspace_domains).values({
                        workspace_id: workspace.id,
                        domain_id: domain.id,
                        scenario,
                    })

                    scenario_domains.push({
                        scenario,
                        domain_id: domain.id,
                        domain_name,
                    })
                }

                return workspaceResult(
                    workspace.id,
                    workspace.expires_at,
                    scenario_domains
                )
            })
        )
    },
    (effect) =>
        effect.pipe(
            Effect.mapError((error) =>
                error instanceof DemoWorkspaceProvisioningError
                    ? error
                    : toProvisioningError(error)
            )
        )
)

/** Expire the caller's active workspace and immediately provision a new one. */
export const resetDemoWorkspace = (contact_id: string, now = new Date()) =>
    provisionDemoWorkspace(contact_id, now, { replace_active: true })

/** Marks active workspaces past their deadline as expired. */
export const expireDemoWorkspaces = (now = new Date()) =>
    Effect.gen(function* () {
        const db = yield* DB
        const expired = yield* db
            .update(demo_workspaces)
            .set({ status: "expired", updated_at: now })
            .where(
                and(
                    eq(demo_workspaces.status, "active"),
                    lte(demo_workspaces.expires_at, now)
                )
            )
            .returning({ id: demo_workspaces.id })

        return expired.length
    }).pipe(Effect.mapError(toProvisioningError))

/**
 * Permanently removes expired or revoked demo workspace data after retention.
 * Contacts are deliberately retained: authentication contacts may be shared
 * with a future demo workspace, while all workspace organisations and domains
 * are disposable.
 */
export const purgeExpiredDemoWorkspaces = (
    now = new Date(),
    retention_ms = demo_workspace_expired_retention_ms
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const cutoff = new Date(now.getTime() - retention_ms)

        return yield* db.transaction((tx) =>
            Effect.gen(function* () {
                const candidates = yield* tx
                    .select({
                        id: demo_workspaces.id,
                        org_id: demo_workspaces.org_id,
                    })
                    .from(demo_workspaces)
                    .where(
                        and(
                            inArray(demo_workspaces.status, [
                                "expired",
                                "revoked",
                            ]),
                            lt(demo_workspaces.expires_at, cutoff)
                        )
                    )

                for (const workspace of candidates) {
                    yield* tx
                        .delete(demo_workspace_domains)
                        .where(
                            eq(
                                demo_workspace_domains.workspace_id,
                                workspace.id
                            )
                        )
                    yield* tx
                        .delete(demo_workspaces)
                        .where(eq(demo_workspaces.id, workspace.id))
                    yield* tx
                        .delete(domains)
                        .where(eq(domains.org_id, workspace.org_id))
                    yield* tx.delete(orgs).where(eq(orgs.id, workspace.org_id))
                }

                return candidates.length
            })
        )
    }).pipe(Effect.mapError(toProvisioningError))

export const DemoWorkspaceProvisioningLive = Layer.effect(
    DemoWorkspaceProvisioning,
    Effect.gen(function* () {
        const db = yield* DB

        return DemoWorkspaceProvisioning.of({
            provision: (contact_id) =>
                provisionDemoWorkspace(contact_id).pipe(
                    Effect.provideService(DB, db)
                ),
        })
    })
)
