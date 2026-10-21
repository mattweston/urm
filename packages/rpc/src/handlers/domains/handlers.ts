/**
 * # Domains RPC Handlers
 *
 * Effect RPC handlers for domain operations.
 * Uses repository for database operations.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { resolveTxt } from "node:dns/promises"
import { DomainsRpcs } from "@urm/contracts/domains"
import { DomainsRepository } from "@urm/contracts/repositories/domains"
import { DomainsRpcHandlersTag } from "./tag.js"
import {
    ConflictError,
    DatabaseError,
    NotFoundError,
} from "@urm/domain/schemas/domains"
import { AuthorizationError, ValidationError } from "@urm/domain/errors"
import { AuthenticatedRequestContext } from "../middleware/index.js"

const DNS_VERIFICATION_RECORD_PREFIX = "_urm"

const getAuthenticatedRequestContext = Effect.serviceOption(
    AuthenticatedRequestContext
).pipe(
    Effect.flatMap(
        Option.match({
            onNone: () =>
                Effect.fail(
                    new AuthorizationError({
                        message: "Authentication required",
                    })
                ),
            onSome: Effect.succeed,
        })
    )
)

const getContactId = getAuthenticatedRequestContext.pipe(
    Effect.map((context) => context.contactId)
)

const isDomainManagerRole = (role: string): boolean =>
    role === "owner" || role === "admin"

const isDomainOwnerRole = (role: string): boolean => role === "owner"

const hasVerificationToken = (
    records: ReadonlyArray<ReadonlyArray<string>>,
    token: string
): boolean =>
    records.some((record) => {
        const value = record.join("").trim()
        return value === token || value === `urm-verification=${token}`
    })

const verifyDnsToken = (apexHostname: string, token: string) =>
    Effect.tryPromise({
        try: () =>
            resolveTxt(`${DNS_VERIFICATION_RECORD_PREFIX}.${apexHostname}`),
        catch: () => new DatabaseError({ message: "Failed to verify DNS" }),
    }).pipe(
        Effect.map((records) => hasVerificationToken(records, token)),
        Effect.catch(() => Effect.succeed(false))
    )

const DomainsRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* DomainsRepository

    const requireDomainAdmin = (domain_id: string) =>
        Effect.gen(function* () {
            const context = yield* getAuthenticatedRequestContext

            if (
                context.domainId !== undefined &&
                context.domainId !== domain_id
            ) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
                )
            }

            const contact_id = context.contactId
            const member = yield* repo.findAdmin(domain_id, contact_id)

            if (member === undefined || member === null) {
                return yield* Effect.fail(
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
                )
            }

            return member
        })

    const requireDomainManager = (domain_id: string) =>
        requireDomainAdmin(domain_id).pipe(
            Effect.filterOrFail(
                (member) => isDomainManagerRole(member.role),
                () =>
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
            )
        )

    const requireDomainOwner = (domain_id: string) =>
        requireDomainAdmin(domain_id).pipe(
            Effect.filterOrFail(
                (member) => isDomainOwnerRole(member.role),
                () =>
                    new AuthorizationError({
                        message: "Not permitted for this domain",
                    })
            )
        )

    return DomainsRpcs.of({
        "domains.create": ({ data }) =>
            Effect.gen(function* () {
                const context = yield* getAuthenticatedRequestContext

                if (context.domainId === undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Organisation domain scope is required",
                        })
                    )
                }

                return yield* repo.createForOrganisationOwner(
                    context.domainId,
                    context.contactId,
                    data
                )
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError ||
                    error instanceof ConflictError ||
                    error instanceof ValidationError
                        ? error
                        : new DatabaseError({
                              message: "Failed to create domain",
                          })
                )
            ),

        "domains.list": () =>
            Effect.gen(function* () {
                const context = yield* getAuthenticatedRequestContext

                if (context.domainId === undefined) {
                    return yield* repo.findByContactId(context.contactId)
                }

                yield* requireDomainAdmin(context.domainId)
                const domain = yield* repo.findById(context.domainId)

                if (domain === null) {
                    return yield* Effect.fail(
                        new DatabaseError({
                            message: "Failed to fetch domains",
                        })
                    )
                }

                return [domain]
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof AuthorizationError) {
                        return error
                    }

                    return new DatabaseError({
                        message: "Failed to fetch domains",
                    })
                })
            ),

        "domains.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                yield* requireDomainAdmin(id)
                const result = yield* repo.findById(id)

                if (!result) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Domain with id ${id} not found`,
                        })
                    )
                }

                return result
            }).pipe(
                Effect.mapError((err) => {
                    if (err instanceof NotFoundError) return err
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Domain not found",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to fetch domain",
                    })
                })
            ),

        "domains.update": ({
            id,
            data,
        }: {
            id: string
            data: { name: string }
        }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(id)
                return yield* repo.update(id, data)
            }).pipe(
                Effect.mapError((err) => {
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Domain not found",
                        })
                    }
                    if (
                        err instanceof Error &&
                        err.message.includes("not found")
                    ) {
                        return new NotFoundError({
                            message: `Domain with id ${id} not found`,
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to update domain",
                    })
                })
            ),

        "domains.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(id)
                return yield* repo.softDelete(id)
            }).pipe(
                Effect.andThen(() => Effect.succeed({ success: true })),
                Effect.mapError((err) => {
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Domain not found",
                        })
                    }
                    if (
                        err instanceof Error &&
                        err.message.includes("not found")
                    ) {
                        return new NotFoundError({
                            message: `Domain with id ${id} not found`,
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to delete domain",
                    })
                })
            ),

        "domains.add_admin": ({
            domain_id,
            contact_id,
            role,
        }: {
            domain_id: string
            contact_id: string
            role: "owner" | "admin" | "editor" | "support" | "viewer"
        }) =>
            Effect.gen(function* () {
                yield* requireDomainOwner(domain_id)
                return yield* repo.addAdmin(domain_id, contact_id, role)
            }).pipe(
                Effect.mapError(
                    () => new DatabaseError({ message: "Failed to add admin" })
                )
            ),

        "domains.list_admins": ({ domain_id }: { domain_id: string }) =>
            Effect.gen(function* () {
                yield* requireDomainAdmin(domain_id)
                return yield* repo.findAdmins(domain_id)
            }).pipe(
                Effect.mapError(
                    () =>
                        new DatabaseError({ message: "Failed to fetch admins" })
                )
            ),

        "domains.update_admin_role": ({
            domain_id,
            contact_id,
            new_role,
        }: {
            domain_id: string
            contact_id: string
            new_role: "owner" | "admin" | "editor" | "support" | "viewer"
        }) =>
            Effect.gen(function* () {
                yield* requireDomainOwner(domain_id)
                return yield* repo.updateAdminRole(
                    domain_id,
                    contact_id,
                    new_role
                )
            }).pipe(
                Effect.mapError((err) => {
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({ message: "Admin not found" })
                    }
                    if (
                        err instanceof Error &&
                        err.message.includes("not found")
                    ) {
                        return new NotFoundError({
                            message: "Admin not found",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to update admin role",
                    })
                })
            ),

        "domains.remove_admin": ({
            domain_id,
            contact_id,
        }: {
            domain_id: string
            contact_id: string
        }) =>
            Effect.gen(function* () {
                yield* requireDomainOwner(domain_id)
                return yield* repo.removeAdmin(domain_id, contact_id)
            }).pipe(
                Effect.andThen(() => Effect.succeed({ success: true })),
                Effect.mapError((err) => {
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({ message: "Admin not found" })
                    }
                    if (
                        err instanceof Error &&
                        err.message.includes("not found")
                    ) {
                        return new NotFoundError({
                            message: "Admin not found",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to remove admin",
                    })
                })
            ),

        "domains.get_admin_role": ({ domain_id }: { domain_id: string }) =>
            Effect.gen(function* () {
                const result = yield* requireDomainAdmin(domain_id)
                return {
                    role: result.role,
                    domain_id,
                }
            }).pipe(
                Effect.mapError((err) => {
                    if (err instanceof NotFoundError) return err
                    if (err instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Domain not found",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to fetch admin role",
                    })
                })
            ),

        "domains.hostnames.create": ({
            data,
        }: {
            data: { domain_id: string; hostname: string }
        }) =>
            Effect.gen(function* () {
                yield* requireDomainManager(data.domain_id)
                return yield* repo.createHostnames(data)
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof NotFoundError) return error
                    if (error instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Domain not found",
                        })
                    }
                    if (
                        error instanceof Error &&
                        error.message.includes("already")
                    ) {
                        return new ConflictError({
                            message: "Hostname is already registered",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to create hostnames",
                    })
                })
            ),

        "domains.hostnames.list": () =>
            Effect.gen(function* () {
                const context = yield* getAuthenticatedRequestContext
                const hostnames = yield* repo.findHostnamesByContactId(
                    context.contactId
                )

                if (context.domainId === undefined) {
                    return hostnames
                }

                yield* requireDomainAdmin(context.domainId)
                return hostnames.filter(
                    (hostname) => hostname.domain_id === context.domainId
                )
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError
                        ? error
                        : new DatabaseError({
                              message: "Failed to fetch hostnames",
                          })
                )
            ),

        "domains.hostnames.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const contactId = yield* getContactId
                const hostname = yield* repo.findHostnameByIdForContact(
                    id,
                    contactId
                )

                if (!hostname) {
                    return yield* Effect.fail(
                        new NotFoundError({ message: "Hostname not found" })
                    )
                }

                yield* requireDomainManager(hostname.domain_id)
                yield* repo.softDeleteHostnameForContact(id, contactId)
                return { success: true }
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof NotFoundError) {
                        return error
                    }
                    if (error instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Hostname not found",
                        })
                    }
                    if (
                        error instanceof Error &&
                        error.message.includes("not found")
                    ) {
                        return new NotFoundError({
                            message: "Hostname not found",
                        })
                    }
                    return new DatabaseError({
                        message: "Failed to delete hostname",
                    })
                })
            ),

        "domains.hostnames.verify_dns": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const contactId = yield* getContactId
                const hostname = yield* repo.findHostnameByIdForContact(
                    id,
                    contactId
                )

                if (!hostname) {
                    return yield* Effect.fail(
                        new NotFoundError({ message: "Hostname not found" })
                    )
                }

                yield* requireDomainManager(hostname.domain_id)

                const verified = yield* verifyDnsToken(
                    hostname.apex_hostname,
                    hostname.verification_token
                )

                if (!verified) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message: `Missing TXT record at ${DNS_VERIFICATION_RECORD_PREFIX}.${hostname.apex_hostname}`,
                        })
                    )
                }

                const hostnames = yield* repo.markApexVerified(
                    hostname.domain_id,
                    hostname.apex_hostname
                )
                return { hostnames }
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof NotFoundError) return error
                    if (error instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Hostname not found",
                        })
                    }
                    if (error instanceof ValidationError) return error
                    return new DatabaseError({
                        message: "Failed to verify DNS",
                    })
                })
            ),

        "domains.hostnames.provision_certificate": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const contactId = yield* getContactId
                const hostname = yield* repo.findHostnameByIdForContact(
                    id,
                    contactId
                )

                if (!hostname) {
                    return yield* Effect.fail(
                        new NotFoundError({ message: "Hostname not found" })
                    )
                }

                yield* requireDomainManager(hostname.domain_id)

                if (hostname.verified_at === undefined) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message: "DNS verification required",
                        })
                    )
                }

                const hostnames = yield* repo.markApexCertificateActive(
                    hostname.domain_id,
                    hostname.apex_hostname
                )
                return { hostnames }
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof NotFoundError) return error
                    if (error instanceof AuthorizationError) {
                        return new NotFoundError({
                            message: "Hostname not found",
                        })
                    }
                    if (error instanceof ValidationError) return error
                    return new DatabaseError({
                        message: "Failed to provision certificate",
                    })
                })
            ),

        "domains.hostnames.resolve": ({ hostname }: { hostname: string }) =>
            Effect.gen(function* () {
                const resolution = yield* repo.resolveHostname(hostname)
                const context = yield* getAuthenticatedRequestContext

                if (
                    context.domainId !== undefined &&
                    resolution.found &&
                    resolution.domain_id !== context.domainId
                ) {
                    return {
                        found: false,
                        hostname: resolution.hostname,
                        should_redirect: false,
                    }
                }

                return resolution
            }).pipe(
                Effect.mapError(
                    () =>
                        new DatabaseError({
                            message: "Failed to resolve hostname",
                        })
                )
            ),
    })
})

export const DomainsRpcLive = DomainsRpcs.toLayer(DomainsRpcHandlersLive)

export const DomainsRpcHandlersTagLive = Layer.effect(
    DomainsRpcHandlersTag,
    DomainsRpcHandlersLive
)
