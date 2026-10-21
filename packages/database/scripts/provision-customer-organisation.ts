#!/usr/bin/env tsx
/**
 * Provisions a production customer organisation, its initial domain, and its
 * owner relationships. It is deliberately an operations-only command: there
 * is no platform RPC that can create an organisation or an initial domain.
 *
 * Usage:
 *
 * ```sh
 * pnpm --filter @urm/db provision:customer -- owner@example.com "Customer Ltd" customer customer
 * ```
 *
 * Add `--confirm-production` when NODE_ENV=production.
 */

import { and, eq, isNull } from "drizzle-orm"
import { Cause, Effect } from "effect"
import {
    DB,
    DatabaseLive,
    databaseOperationError,
    loadEnvironmentConfig,
    schema,
} from "@urm/db"

const provisionError = (reason: string) =>
    databaseOperationError("ProvisionCustomerOrganisation.run", reason)

type ProvisionCustomerInput = Readonly<{
    email: string
    org_name: string
    org_slug: string
    domain_name: string
    confirm_production: boolean
}>

const findActiveContact = (email: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const contacts = yield* db
            .select({ id: schema.contacts.id })
            .from(schema.contacts)
            .where(
                and(
                    eq(schema.contacts.email, email),
                    isNull(schema.contacts.deleted_at)
                )
            )
            .limit(1)
        const contact = contacts[0]

        if (contact === undefined) {
            return yield* Effect.fail(
                provisionError(
                    "No active contact exists for the supplied email address"
                )
            )
        }

        return contact
    })

const provisionCustomerOrganisation = Effect.fn(
    "ProvisionCustomerOrganisation"
)(function* (input: ProvisionCustomerInput) {
    const environment = yield* loadEnvironmentConfig

    if (environment.env === "production" && !input.confirm_production) {
        return yield* Effect.fail(
            provisionError(
                "Pass --confirm-production to provision a production customer"
            )
        )
    }

    if (
        input.org_name.length === 0 ||
        !/^[a-z0-9-]+$/.test(input.org_slug) ||
        !/^[a-z0-9-]+$/.test(input.domain_name) ||
        input.domain_name === "demo" ||
        input.domain_name.startsWith("demo-")
    ) {
        return yield* Effect.fail(
            provisionError(
                "Organisation and domain slugs must use lowercase letters, numbers, and hyphens; demo- is reserved"
            )
        )
    }

    const db = yield* DB
    const contact = yield* findActiveContact(input.email)

    return yield* db.transaction((tx) =>
        Effect.gen(function* () {
            const existing_organisations = yield* tx
                .select()
                .from(schema.orgs)
                .where(eq(schema.orgs.slug, input.org_slug))
                .limit(1)
            const existing_organisation = existing_organisations[0]

            if (
                existing_organisation !== undefined &&
                existing_organisation.deleted_at !== null
            ) {
                return yield* Effect.fail(
                    provisionError(
                        "Organisation slug belongs to a deleted organisation"
                    )
                )
            }

            const organisation =
                existing_organisation === undefined
                    ? yield* tx
                          .insert(schema.orgs)
                          .values({
                              name: input.org_name,
                              slug: input.org_slug,
                              kind: "customer",
                          })
                          .returning()
                          .pipe(
                              Effect.flatMap((rows) => {
                                  const row = rows[0]
                                  return row === undefined
                                      ? Effect.fail(
                                            provisionError(
                                                "Failed to create organisation"
                                            )
                                        )
                                      : Effect.succeed(row)
                              })
                          )
                    : existing_organisation

            const existing_domains = yield* tx
                .select()
                .from(schema.domains)
                .where(eq(schema.domains.name, input.domain_name))
                .limit(1)
            const existing_domain = existing_domains[0]

            if (
                existing_domain !== undefined &&
                existing_domain.deleted_at !== null
            ) {
                return yield* Effect.fail(
                    provisionError("Domain name belongs to a deleted domain")
                )
            }

            if (
                existing_domain !== undefined &&
                existing_domain.org_id !== organisation.id
            ) {
                return yield* Effect.fail(
                    provisionError(
                        "Domain name belongs to a different organisation"
                    )
                )
            }

            const domain =
                existing_domain === undefined
                    ? yield* tx
                          .insert(schema.domains)
                          .values({
                              org_id: organisation.id,
                              name: input.domain_name,
                              created_by_contact_id: contact.id,
                          })
                          .returning()
                          .pipe(
                              Effect.flatMap((rows) => {
                                  const row = rows[0]
                                  return row === undefined
                                      ? Effect.fail(
                                            provisionError(
                                                "Failed to create domain"
                                            )
                                        )
                                      : Effect.succeed(row)
                              })
                          )
                    : existing_domain

            const now = new Date()
            const owner_memberships = yield* tx
                .update(schema.org_contacts)
                .set({ role: "owner", status: "active", updated_at: now })
                .where(
                    and(
                        eq(schema.org_contacts.org_id, organisation.id),
                        eq(schema.org_contacts.contact_id, contact.id),
                        isNull(schema.org_contacts.deleted_at)
                    )
                )
                .returning()

            if (owner_memberships.length === 0) {
                yield* tx.insert(schema.org_contacts).values({
                    org_id: organisation.id,
                    contact_id: contact.id,
                    role: "owner",
                    status: "active",
                })
            }

            const domain_contacts = yield* tx
                .update(schema.domain_contacts)
                .set({
                    status: "active",
                    source: "domain_admin",
                    updated_at: now,
                })
                .where(
                    and(
                        eq(schema.domain_contacts.domain_id, domain.id),
                        eq(schema.domain_contacts.contact_id, contact.id),
                        isNull(schema.domain_contacts.deleted_at)
                    )
                )
                .returning()

            if (domain_contacts.length === 0) {
                yield* tx.insert(schema.domain_contacts).values({
                    domain_id: domain.id,
                    contact_id: contact.id,
                    status: "active",
                    source: "domain_admin",
                })
            }

            const domain_administrators = yield* tx
                .update(schema.domain_admin)
                .set({ role: "owner", status: "active", updated_at: now })
                .where(
                    and(
                        eq(schema.domain_admin.domain_id, domain.id),
                        eq(schema.domain_admin.contact_id, contact.id),
                        isNull(schema.domain_admin.deleted_at)
                    )
                )
                .returning()

            if (domain_administrators.length === 0) {
                yield* tx.insert(schema.domain_admin).values({
                    domain_id: domain.id,
                    contact_id: contact.id,
                    role: "owner",
                    status: "active",
                })
            }

            return {
                domain_name: domain.name,
                org_slug: organisation.slug,
            }
        })
    )
})

const [email, org_name, org_slug, domain_name] = process.argv.slice(2)
const confirm_production = process.argv.includes("--confirm-production")

if (
    email === undefined ||
    org_name === undefined ||
    org_slug === undefined ||
    domain_name === undefined
) {
    console.error(
        'Usage: pnpm --filter @urm/db provision:customer -- owner@example.com "Customer Ltd" customer customer [--confirm-production]'
    )
    process.exitCode = 1
} else {
    const input: ProvisionCustomerInput = {
        email: email.trim().toLowerCase(),
        org_name: org_name.trim(),
        org_slug: org_slug.trim().toLowerCase(),
        domain_name: domain_name.trim().toLowerCase(),
        confirm_production,
    }
    const program = provisionCustomerOrganisation(input).pipe(
        Effect.provide(DatabaseLive)
    )

    Effect.runPromiseExit(program).then((exit) => {
        if (exit._tag === "Success") {
            console.log(
                `Provisioned ${exit.value.org_slug}: ${exit.value.domain_name}.urm.dev and urm.${exit.value.domain_name}.urm.dev`
            )
            return
        }

        console.error(Cause.pretty(exit.cause))
        process.exitCode = 1
    })
}
