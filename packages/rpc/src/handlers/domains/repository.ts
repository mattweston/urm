/**
 * # Domains Repository
 *
 * CRUD operations via Effect
 *
 * Feature-specific repository with full type safety for domain operations.
 * Validates input via Effect schemas and executes Drizzle queries.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { eq, and, count, inArray, isNull, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { DB } from "@urm/database/layer"
import { contacts } from "@urm/database/legacy-schema/contacts"
import {
    domain_admin,
    domain_contacts,
    domains,
    domain_hostnames,
} from "@urm/database/legacy-schema/domains"
import { org_contacts, orgs } from "@urm/database/legacy-schema/organisations"
import {
    Domain,
    CreateDomainInput,
    CreateDomainHostnameInput,
    type DomainHostname,
    type DomainHostnameResolution,
    type DomainHostnameKind,
    type DomainHostnameStatus,
} from "@urm/domain/schemas/domains"
import {
    AuthorizationError,
    ConflictError,
    ValidationError,
} from "@urm/domain/errors"
import {
    DomainsRepository,
    type DomainsRepositoryType,
} from "@urm/contracts/repositories/domains"
import { repositoryError } from "../errors.ts"

type DomainAdminRow = typeof domain_admin.$inferSelect
type DomainHostnameRow = typeof domain_hostnames.$inferSelect

type DomainResultRow = Readonly<{
    id: string
    org_id: string
    name: string
    created_by_contact_id: string | null
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
}>

type NewHostnameRow = Readonly<{
    domain_id: string
    hostname: string
    apex_hostname: string
    kind: DomainHostnameKind
    status: DomainHostnameStatus
    is_primary: boolean
    verification_token: string
}>

const toDomain = (row: DomainResultRow): Domain => ({
    ...row,
    created_by_contact_id: row.created_by_contact_id ?? "",
    deleted_at: row.deleted_at ?? undefined,
})

const toDomainAdminWithInfo = (row: DomainAdminRow) => ({
    id: row.id,
    domain_id: row.domain_id,
    contact_id: row.contact_id,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
})

const toDomainHostname = (row: DomainHostnameRow): DomainHostname => ({
    ...row,
    verified_at: row.verified_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
})

const normalizeHostname = (hostname: string): string =>
    hostname.trim().toLowerCase().replace(/\.$/, "")

const normalizeRequestHostname = (hostname: string): string =>
    normalizeHostname(hostname).split(":")[0] ?? ""

const isReservedDemoDomainName = (name: string): boolean =>
    name === "demo" || name.startsWith("demo-")

const toApexHostname = (hostname: string): string =>
    hostname.startsWith("urm.")
        ? hostname.slice(4)
        : hostname.startsWith("www.")
          ? hostname.slice(4)
          : hostname

const notFoundHostnameResolution = (
    hostname: string
): DomainHostnameResolution => ({
    found: false,
    hostname,
    should_redirect: false,
})

const toGeneratedDomainName = (hostname: string): string | null => {
    const suffix = hostname.endsWith(".localhost")
        ? ".localhost"
        : hostname.endsWith(".urm.dev")
          ? ".urm.dev"
          : undefined

    if (suffix === undefined) {
        return null
    }

    const name = hostname.slice(0, -suffix.length)
    const domainName = name.startsWith("urm.") ? name.slice(4) : name
    return domainName === "" || domainName.includes(".") ? null : domainName
}

const toHostnamePair = (hostname: string): ReadonlyArray<string> => {
    const apexHostname = toApexHostname(normalizeHostname(hostname))
    return [apexHostname, `urm.${apexHostname}`]
}

const toHostnameRows = (
    domainId: string,
    hostname: string,
    existingHostnames: ReadonlyArray<string>
): ReadonlyArray<NewHostnameRow> => {
    const apexHostname = toApexHostname(normalizeHostname(hostname))
    const verificationToken = randomUUID()
    const rows: ReadonlyArray<NewHostnameRow> = [
        {
            domain_id: domainId,
            hostname: apexHostname,
            apex_hostname: apexHostname,
            kind: "apex",
            status: "pending_dns",
            is_primary: false,
            verification_token: verificationToken,
        },
        {
            domain_id: domainId,
            hostname: `urm.${apexHostname}`,
            apex_hostname: apexHostname,
            kind: "custom",
            status: "pending_dns",
            is_primary: true,
            verification_token: verificationToken,
        },
    ]
    return rows.filter((row) => !existingHostnames.includes(row.hostname))
}

export const DomainsRepositoryLive = Layer.effect(
    DomainsRepository,
    Effect.gen(function* () {
        const db = yield* DB

        const ensureContactExists = (contactId: string) =>
            db
                .insert(contacts)
                .values({
                    id: contactId,
                    email: `${contactId}@demo.urm.local`,
                    name: "Demo Contact",
                    email_verified: true,
                    is_test_contact: true,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                })
                .onConflictDoNothing()
                .pipe(Effect.mapError(repositoryError))

        const ensureDomainContact = (domainId: string, contactId: string) =>
            db
                .insert(domain_contacts)
                .values({
                    domain_id: domainId,
                    contact_id: contactId,
                    source: "domain_admin",
                })
                .onConflictDoNothing()
                .pipe(Effect.mapError(repositoryError))

        /**
         * Prevents retained domain-admin grants from outliving organization access.
         * Direct repository callers need the same suspension and deletion checks
         * as RPC middleware; an existing grant is not proof of current authority.
         */
        const requireActiveOrganisationMember = (
            domainId: string,
            contactId: string
        ) =>
            Effect.gen(function* () {
                const memberships = yield* db
                    .select({ id: org_contacts.id })
                    .from(domains)
                    .innerJoin(orgs, eq(orgs.id, domains.org_id))
                    .innerJoin(
                        org_contacts,
                        and(
                            eq(org_contacts.org_id, domains.org_id),
                            eq(org_contacts.contact_id, contactId),
                            eq(org_contacts.status, "active"),
                            isNull(org_contacts.deleted_at)
                        )
                    )
                    .where(
                        and(
                            eq(domains.id, domainId),
                            isNull(domains.deleted_at),
                            isNull(orgs.deleted_at)
                        )
                    )
                    .limit(1)
                    .pipe(Effect.mapError(repositoryError))

                if (memberships[0] === undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message:
                                "An active organisation membership is required",
                        })
                    )
                }
            })

        const syncDomainAdmin = (
            domainId: string,
            contactId: string,
            role: "member" | "admin" | "owner"
        ) =>
            Effect.gen(function* () {
                if (role !== "admin" && role !== "owner") {
                    yield* db
                        .update(domain_admin)
                        .set({ deleted_at: new Date(), updated_at: new Date() })
                        .where(
                            and(
                                eq(domain_admin.domain_id, domainId),
                                eq(domain_admin.contact_id, contactId),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))
                    return
                }

                const existing = yield* db
                    .select()
                    .from(domain_admin)
                    .where(
                        and(
                            eq(domain_admin.domain_id, domainId),
                            eq(domain_admin.contact_id, contactId),
                            isNull(domain_admin.deleted_at)
                        )
                    )
                    .limit(1)
                    .pipe(Effect.mapError(repositoryError))

                if (existing[0] !== undefined) {
                    yield* db
                        .update(domain_admin)
                        .set({ role, status: "active", updated_at: new Date() })
                        .where(eq(domain_admin.id, existing[0].id))
                        .pipe(Effect.mapError(repositoryError))
                    return
                }

                yield* db
                    .insert(domain_admin)
                    .values({
                        domain_id: domainId,
                        contact_id: contactId,
                        role,
                        status: "active",
                    })
                    .pipe(Effect.mapError(repositoryError))
            })

        const repository: DomainsRepositoryType = {
            // Create a new domain
            insert: (data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateDomainInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )
                    const contactId = data.created_by_contact_id

                    if (isReservedDemoDomainName(validated.name)) {
                        return yield* Effect.fail(
                            new ValidationError({
                                message:
                                    "Domain names beginning with demo- are reserved",
                            })
                        )
                    }

                    const inserted = yield* ensureContactExists(contactId)
                        .pipe(
                            Effect.andThen(() =>
                                db
                                    .insert(domains)
                                    .values({
                                        org_id: data.org_id,
                                        name: validated.name,
                                        created_by_contact_id: contactId,
                                    })
                                    .returning()
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to insert domain")
                        )
                    }

                    const domain = inserted[0]!

                    yield* ensureDomainContact(domain.id, contactId)
                    yield* syncDomainAdmin(domain.id, contactId, "owner")

                    return {
                        item: toDomain(domain),
                        txid: 0,
                    }
                }),

            createForOrganisationOwner: (active_domain_id, contact_id, data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateDomainInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    if (isReservedDemoDomainName(validated.name)) {
                        return yield* Effect.fail(
                            new ValidationError({
                                message:
                                    "Domain names beginning with demo- are reserved",
                            })
                        )
                    }

                    return yield* db
                        .transaction((tx) =>
                            Effect.gen(function* () {
                                const source_domains = yield* tx
                                    .select({ org_id: domains.org_id })
                                    .from(domains)
                                    .where(
                                        and(
                                            eq(domains.id, active_domain_id),
                                            isNull(domains.deleted_at)
                                        )
                                    )
                                    .limit(1)
                                    .pipe(Effect.mapError(repositoryError))
                                const source_domain = source_domains[0]

                                if (source_domain === undefined) {
                                    return yield* Effect.fail(
                                        new AuthorizationError({
                                            message:
                                                "Organisation domain is unavailable",
                                        })
                                    )
                                }

                                yield* tx
                                    .execute(sql`
                                SELECT "id"
                                FROM "orgs"
                                WHERE "id" = ${source_domain.org_id}
                                    AND "deleted_at" IS NULL
                                FOR UPDATE
                            `)
                                    .pipe(Effect.mapError(repositoryError))

                                const organisations = yield* tx
                                    .select({ max_domains: orgs.max_domains })
                                    .from(orgs)
                                    .where(
                                        and(
                                            eq(orgs.id, source_domain.org_id),
                                            isNull(orgs.deleted_at)
                                        )
                                    )
                                    .limit(1)
                                    .pipe(Effect.mapError(repositoryError))
                                const organisation = organisations[0]

                                if (organisation === undefined) {
                                    return yield* Effect.fail(
                                        new AuthorizationError({
                                            message:
                                                "Organisation is unavailable",
                                        })
                                    )
                                }

                                const owner_memberships = yield* tx
                                    .select({ id: org_contacts.id })
                                    .from(org_contacts)
                                    .where(
                                        and(
                                            eq(
                                                org_contacts.org_id,
                                                source_domain.org_id
                                            ),
                                            eq(
                                                org_contacts.contact_id,
                                                contact_id
                                            ),
                                            eq(org_contacts.role, "owner"),
                                            eq(org_contacts.status, "active"),
                                            isNull(org_contacts.deleted_at)
                                        )
                                    )
                                    .limit(1)
                                    .pipe(Effect.mapError(repositoryError))

                                if (owner_memberships[0] === undefined) {
                                    return yield* Effect.fail(
                                        new AuthorizationError({
                                            message:
                                                "Organisation owner access is required",
                                        })
                                    )
                                }

                                const active_domain_counts = yield* tx
                                    .select({ count: count() })
                                    .from(domains)
                                    .where(
                                        and(
                                            eq(
                                                domains.org_id,
                                                source_domain.org_id
                                            ),
                                            isNull(domains.deleted_at)
                                        )
                                    )
                                    .pipe(Effect.mapError(repositoryError))
                                const active_domain_count = Number(
                                    active_domain_counts[0]?.count ?? 0
                                )

                                if (
                                    active_domain_count >=
                                    organisation.max_domains
                                ) {
                                    return yield* Effect.fail(
                                        new ConflictError({
                                            message:
                                                "Organisation domain limit reached",
                                        })
                                    )
                                }

                                const inserted = yield* tx
                                    .insert(domains)
                                    .values({
                                        org_id: source_domain.org_id,
                                        name: validated.name,
                                        created_by_contact_id: contact_id,
                                    })
                                    .returning()
                                    .pipe(Effect.mapError(repositoryError))
                                const domain = inserted[0]

                                if (domain === undefined) {
                                    return yield* Effect.fail(
                                        repositoryError(
                                            "Failed to insert domain"
                                        )
                                    )
                                }

                                yield* tx
                                    .insert(domain_contacts)
                                    .values({
                                        domain_id: domain.id,
                                        contact_id,
                                        source: "domain_admin",
                                    })
                                    .onConflictDoNothing()
                                    .pipe(Effect.mapError(repositoryError))
                                yield* tx
                                    .insert(domain_admin)
                                    .values({
                                        domain_id: domain.id,
                                        contact_id,
                                        role: "owner",
                                        status: "active",
                                    })
                                    .onConflictDoNothing()
                                    .pipe(Effect.mapError(repositoryError))

                                return {
                                    item: toDomain(domain),
                                    txid: 0,
                                }
                            })
                        )
                        .pipe(Effect.mapError(repositoryError))
                }),

            // Find domain by ID
            findById: (id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(domains)
                        .where(
                            and(eq(domains.id, id), isNull(domains.deleted_at))
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return toDomain(results[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            // Find domains for which the contact has an explicit active domain-admin role.
            findByContactId: (contactId: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select({
                            id: domains.id,
                            org_id: domains.org_id,
                            name: domains.name,
                            created_by_contact_id:
                                domains.created_by_contact_id,
                            created_at: domains.created_at,
                            updated_at: domains.updated_at,
                            deleted_at: domains.deleted_at,
                        })
                        .from(domains)
                        .innerJoin(
                            domain_admin,
                            eq(domains.id, domain_admin.domain_id)
                        )
                        .where(
                            and(
                                eq(domain_admin.contact_id, contactId),
                                eq(domain_admin.status, "active"),
                                isNull(domains.deleted_at),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDomain)
                }).pipe(Effect.mapError(repositoryError)),

            // Update domain
            update: (id: string, data: { name: string }) =>
                Effect.gen(function* () {
                    const updated = yield* db
                        .update(domains)
                        .set({
                            name: data.name,
                            updated_at: new Date(),
                        })
                        .where(eq(domains.id, id))
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError(`Domain with ID ${id} not found`)
                        )
                    }

                    return {
                        item: toDomain(updated[0]!),
                        txid: 0,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            // Soft delete domain
            softDelete: (id: string) =>
                Effect.gen(function* () {
                    yield* db
                        .update(domains)
                        .set({ deleted_at: new Date() })
                        .where(eq(domains.id, id))
                        .pipe(Effect.mapError(repositoryError))

                    yield* db
                        .update(domain_admin)
                        .set({ deleted_at: new Date(), updated_at: new Date() })
                        .where(eq(domain_admin.domain_id, id))
                        .pipe(Effect.mapError(repositoryError))

                    yield* db
                        .update(domain_contacts)
                        .set({ deleted_at: new Date(), updated_at: new Date() })
                        .where(eq(domain_contacts.domain_id, id))
                        .pipe(Effect.mapError(repositoryError))
                }).pipe(Effect.mapError(repositoryError)),

            addAdmin: (domainId, contactId, role) =>
                Effect.gen(function* () {
                    yield* ensureContactExists(contactId)
                    yield* requireActiveOrganisationMember(domainId, contactId)
                    yield* ensureDomainContact(domainId, contactId)

                    const existing = yield* repository.findAdmin(
                        domainId,
                        contactId
                    )
                    if (existing !== null) {
                        return yield* repository.updateAdminRole(
                            domainId,
                            contactId,
                            role
                        )
                    }

                    const inserted = yield* db
                        .insert(domain_admin)
                        .values({
                            domain_id: domainId,
                            contact_id: contactId,
                            role,
                            status: "active",
                        })
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (inserted.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Failed to add admin")
                        )
                    }

                    return toDomainAdminWithInfo(inserted[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            findAdmins: (domainId) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(domain_admin)
                        .where(
                            and(
                                eq(domain_admin.domain_id, domainId),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDomainAdminWithInfo)
                }).pipe(Effect.mapError(repositoryError)),

            updateAdminRole: (domainId, contactId, role) =>
                Effect.gen(function* () {
                    yield* requireActiveOrganisationMember(domainId, contactId)
                    yield* ensureDomainContact(domainId, contactId)

                    const updated = yield* db
                        .update(domain_admin)
                        .set({ role, status: "active", updated_at: new Date() })
                        .where(
                            and(
                                eq(domain_admin.domain_id, domainId),
                                eq(domain_admin.contact_id, contactId),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Admin not found")
                        )
                    }

                    return toDomainAdminWithInfo(updated[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            removeAdmin: (domainId, contactId) =>
                Effect.gen(function* () {
                    yield* db
                        .update(domain_admin)
                        .set({ deleted_at: new Date(), updated_at: new Date() })
                        .where(
                            and(
                                eq(domain_admin.domain_id, domainId),
                                eq(domain_admin.contact_id, contactId),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))
                }).pipe(Effect.mapError(repositoryError)),

            /**
             * Returns a usable grant only after checking its parent membership.
             * Callers use this lookup for authorization, so it must enforce the
             * same boundary even when invoked without domain-manager middleware.
             */
            findAdmin: (domainId, contactId) =>
                Effect.gen(function* () {
                    yield* requireActiveOrganisationMember(domainId, contactId)
                    const results = yield* db
                        .select()
                        .from(domain_admin)
                        .where(
                            and(
                                eq(domain_admin.domain_id, domainId),
                                eq(domain_admin.contact_id, contactId),
                                eq(domain_admin.status, "active"),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .limit(1)
                        .pipe(Effect.mapError(repositoryError))

                    const row = results[0]
                    return row === undefined ? null : toDomainAdminWithInfo(row)
                }).pipe(Effect.mapError(repositoryError)),

            createHostnames: (data) =>
                Effect.gen(function* () {
                    const validated = yield* Schema.decodeUnknownEffect(
                        CreateDomainHostnameInput
                    )(data).pipe(
                        Effect.mapError((error) =>
                            repositoryError(`Validation failed: ${error}`)
                        )
                    )

                    const apexHostname = toApexHostname(
                        normalizeHostname(validated.hostname)
                    )
                    const domainHostnames = yield* db
                        .select()
                        .from(domain_hostnames)
                        .where(
                            and(
                                eq(
                                    domain_hostnames.domain_id,
                                    validated.domain_id
                                ),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const differentApex = domainHostnames.find(
                        (row) => row.apex_hostname !== apexHostname
                    )

                    if (differentApex) {
                        return yield* Effect.fail(
                            repositoryError(
                                "Workspace already has a custom domain"
                            )
                        )
                    }

                    const hostnames = toHostnamePair(validated.hostname)
                    const existing = yield* db
                        .select()
                        .from(domain_hostnames)
                        .where(
                            and(
                                inArray(domain_hostnames.hostname, [
                                    ...hostnames,
                                ]),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const conflicting = existing.find(
                        (row) => row.domain_id !== validated.domain_id
                    )

                    if (conflicting) {
                        return yield* Effect.fail(
                            repositoryError(
                                `Hostname ${conflicting.hostname} is already registered`
                            )
                        )
                    }

                    const existingHostnames = existing.map(
                        (row) => row.hostname
                    )
                    const rows = toHostnameRows(
                        validated.domain_id,
                        validated.hostname,
                        existingHostnames
                    )

                    if (rows.length > 0) {
                        yield* db
                            .insert(domain_hostnames)
                            .values([...rows])
                            .pipe(Effect.mapError(repositoryError))
                    }

                    const results = yield* db
                        .select()
                        .from(domain_hostnames)
                        .where(
                            and(
                                eq(
                                    domain_hostnames.domain_id,
                                    validated.domain_id
                                ),
                                inArray(domain_hostnames.hostname, [
                                    ...hostnames,
                                ]),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDomainHostname)
                }).pipe(Effect.mapError(repositoryError)),

            findHostnamesByContactId: (contactId: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select({
                            id: domain_hostnames.id,
                            domain_id: domain_hostnames.domain_id,
                            hostname: domain_hostnames.hostname,
                            apex_hostname: domain_hostnames.apex_hostname,
                            kind: domain_hostnames.kind,
                            status: domain_hostnames.status,
                            is_primary: domain_hostnames.is_primary,
                            verification_token:
                                domain_hostnames.verification_token,
                            verified_at: domain_hostnames.verified_at,
                            created_at: domain_hostnames.created_at,
                            updated_at: domain_hostnames.updated_at,
                            deleted_at: domain_hostnames.deleted_at,
                        })
                        .from(domain_hostnames)
                        .innerJoin(
                            domain_admin,
                            eq(
                                domain_hostnames.domain_id,
                                domain_admin.domain_id
                            )
                        )
                        .where(
                            and(
                                eq(domain_admin.contact_id, contactId),
                                eq(domain_admin.status, "active"),
                                isNull(domain_hostnames.deleted_at),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    return results.map(toDomainHostname)
                }).pipe(Effect.mapError(repositoryError)),

            findHostnameByIdForContact: (id: string, contactId: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select({
                            id: domain_hostnames.id,
                            domain_id: domain_hostnames.domain_id,
                            hostname: domain_hostnames.hostname,
                            apex_hostname: domain_hostnames.apex_hostname,
                            kind: domain_hostnames.kind,
                            status: domain_hostnames.status,
                            is_primary: domain_hostnames.is_primary,
                            verification_token:
                                domain_hostnames.verification_token,
                            verified_at: domain_hostnames.verified_at,
                            created_at: domain_hostnames.created_at,
                            updated_at: domain_hostnames.updated_at,
                            deleted_at: domain_hostnames.deleted_at,
                        })
                        .from(domain_hostnames)
                        .innerJoin(
                            domain_admin,
                            eq(
                                domain_hostnames.domain_id,
                                domain_admin.domain_id
                            )
                        )
                        .where(
                            and(
                                eq(domain_hostnames.id, id),
                                eq(domain_admin.contact_id, contactId),
                                eq(domain_admin.status, "active"),
                                isNull(domain_hostnames.deleted_at),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return null
                    }

                    return toDomainHostname(results[0]!)
                }).pipe(Effect.mapError(repositoryError)),

            markApexVerified: (domainId: string, apexHostname: string) =>
                Effect.gen(function* () {
                    const now = new Date()
                    const updated = yield* db
                        .update(domain_hostnames)
                        .set({
                            status: "pending_certificate",
                            verified_at: now,
                            updated_at: now,
                        })
                        .where(
                            and(
                                eq(domain_hostnames.domain_id, domainId),
                                eq(
                                    domain_hostnames.apex_hostname,
                                    apexHostname
                                ),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    if (updated.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Hostname not found")
                        )
                    }

                    return updated.map(toDomainHostname)
                }).pipe(Effect.mapError(repositoryError)),

            markApexCertificateActive: (
                domainId: string,
                apexHostname: string
            ) =>
                Effect.gen(function* () {
                    const existing = yield* db
                        .select()
                        .from(domain_hostnames)
                        .where(
                            and(
                                eq(domain_hostnames.domain_id, domainId),
                                eq(
                                    domain_hostnames.apex_hostname,
                                    apexHostname
                                ),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (existing.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Hostname not found")
                        )
                    }

                    if (existing.some((row) => row.verified_at === null)) {
                        return yield* Effect.fail(
                            repositoryError("DNS verification required")
                        )
                    }

                    const now = new Date()
                    const updated = yield* db
                        .update(domain_hostnames)
                        .set({
                            status: "active",
                            updated_at: now,
                        })
                        .where(
                            and(
                                eq(domain_hostnames.domain_id, domainId),
                                eq(
                                    domain_hostnames.apex_hostname,
                                    apexHostname
                                ),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .returning()
                        .pipe(Effect.mapError(repositoryError))

                    return updated.map(toDomainHostname)
                }).pipe(Effect.mapError(repositoryError)),

            resolveHostname: (hostname: string) =>
                Effect.gen(function* () {
                    const normalizedHostname =
                        normalizeRequestHostname(hostname)
                    const maybeGeneratedDomainName =
                        toGeneratedDomainName(normalizedHostname)

                    if (
                        maybeGeneratedDomainName !== null &&
                        maybeGeneratedDomainName !== ""
                    ) {
                        const generatedDomains = yield* db
                            .select()
                            .from(domains)
                            .where(
                                and(
                                    eq(domains.name, maybeGeneratedDomainName),
                                    isNull(domains.deleted_at)
                                )
                            )
                            .pipe(Effect.mapError(repositoryError))

                        if (generatedDomains.length === 0) {
                            return notFoundHostnameResolution(
                                normalizedHostname
                            )
                        }

                        const domain = generatedDomains[0]!
                        return {
                            found: true,
                            hostname: normalizedHostname,
                            should_redirect: false,
                            domain_id: domain.id,
                            domain_name: domain.name,
                        }
                    }

                    const results = yield* db
                        .select({
                            id: domain_hostnames.id,
                            domain_id: domain_hostnames.domain_id,
                            hostname: domain_hostnames.hostname,
                            apex_hostname: domain_hostnames.apex_hostname,
                            kind: domain_hostnames.kind,
                            status: domain_hostnames.status,
                            is_primary: domain_hostnames.is_primary,
                            domain_name: domains.name,
                        })
                        .from(domain_hostnames)
                        .innerJoin(
                            domains,
                            eq(domain_hostnames.domain_id, domains.id)
                        )
                        .where(
                            and(
                                eq(
                                    domain_hostnames.hostname,
                                    normalizedHostname
                                ),
                                isNull(domain_hostnames.deleted_at),
                                isNull(domains.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (results.length === 0) {
                        return notFoundHostnameResolution(normalizedHostname)
                    }

                    const result = results[0]!

                    if (result.status !== "active" || result.is_primary) {
                        return {
                            found: true,
                            hostname: normalizedHostname,
                            should_redirect: false,
                            domain_id: result.domain_id,
                            domain_name: result.domain_name,
                            hostname_id: result.id,
                            status: result.status,
                        }
                    }

                    const primaryResults = yield* db
                        .select({ hostname: domain_hostnames.hostname })
                        .from(domain_hostnames)
                        .where(
                            and(
                                eq(
                                    domain_hostnames.domain_id,
                                    result.domain_id
                                ),
                                eq(
                                    domain_hostnames.apex_hostname,
                                    result.apex_hostname
                                ),
                                eq(domain_hostnames.is_primary, true),
                                eq(domain_hostnames.status, "active"),
                                isNull(domain_hostnames.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    const primary = primaryResults[0]

                    return {
                        found: true,
                        hostname: normalizedHostname,
                        should_redirect: primary !== undefined,
                        canonical_hostname: primary?.hostname,
                        domain_id: result.domain_id,
                        domain_name: result.domain_name,
                        hostname_id: result.id,
                        status: result.status,
                    }
                }).pipe(Effect.mapError(repositoryError)),

            softDeleteHostnameForContact: (id: string, contactId: string) =>
                Effect.gen(function* () {
                    const existing = yield* db
                        .select({ id: domain_hostnames.id })
                        .from(domain_hostnames)
                        .innerJoin(
                            domain_admin,
                            eq(
                                domain_hostnames.domain_id,
                                domain_admin.domain_id
                            )
                        )
                        .where(
                            and(
                                eq(domain_hostnames.id, id),
                                eq(domain_admin.contact_id, contactId),
                                eq(domain_admin.status, "active"),
                                isNull(domain_hostnames.deleted_at),
                                isNull(domain_admin.deleted_at)
                            )
                        )
                        .pipe(Effect.mapError(repositoryError))

                    if (existing.length === 0) {
                        return yield* Effect.fail(
                            repositoryError("Hostname not found")
                        )
                    }

                    yield* db
                        .update(domain_hostnames)
                        .set({ deleted_at: new Date() })
                        .where(eq(domain_hostnames.id, id))
                        .pipe(Effect.mapError(repositoryError))
                }).pipe(Effect.mapError(repositoryError)),
        }

        return repository
    })
)
