/**
 * # RPC Middleware Implementations
 *
 * Implements the five middlewares declared in @urm/contracts/auth-legacy.
 *
 * Three of them derive the entire tenant scope from the client-supplied
 * `x-urm-original-host` header, trusted only because `domainWorkerToken`
 * verifies the request came from a domain worker. That token is a
 * tenant-isolation boundary — this server must never be reachable directly from
 * a browser.
 */

import { AuditEventPersistence } from "@urm/auth/audit-events"
import {
    getDomainSession,
    isCentralApplicationOrigin,
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "@urm/auth/domain-sessions"
import { getAuthSessionContactId } from "@urm/auth/sessions"
import { DB, schema } from "@urm/database"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { AuthorizationError } from "@urm/domain/errors"
import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    PublicWorkerRequestContext,
    PublicWorkerRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
    PlatformAdminRpcMiddleware,
    type AuthenticatedRpcRequestContext,
} from "@urm/contracts/auth-legacy"
import { and, eq, isNull, sql } from "drizzle-orm"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { ContactId } from "@urm/domain/schemas/contacts"

export type AppRpcRequestContext = AuthenticatedRpcRequestContext

export {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware as AppActiveDomainRpcMiddleware,
    PublicWorkerRequestContext,
    PublicWorkerRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware as AppRpcAuthMiddleware,
    PlatformAdminRpcMiddleware,
    DomainManagerRpcMiddleware,
}

type DomainManagerLookup = {
    readonly domain_id: string
    readonly contact_id: ContactId
}

export class RpcAuthorizationPersistence extends Context.Service<
    RpcAuthorizationPersistence,
    {
        readonly isDomainManager: (
            lookup: DomainManagerLookup
        ) => Effect.Effect<boolean>
        readonly isPlatformAdmin: (
            contact_id: ContactId
        ) => Effect.Effect<boolean>
    }
>()("@urm/rpc/RpcAuthorizationPersistence") {}

/**
 * Resolves legacy RPC authority against current membership and resource state.
 * A domain-admin grant can survive organization suspension or soft deletion, so
 * that grant alone must never authorize a request. Keep the organization checks
 * aligned with the domain repository's direct admin lookup.
 */
export const RpcAuthorizationPersistenceLive = Layer.effect(
    RpcAuthorizationPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return RpcAuthorizationPersistence.of({
            isDomainManager: ({ domain_id, contact_id }) =>
                db
                    .select({ id: schema.domain_admin.id })
                    .from(schema.domain_admin)
                    .innerJoin(
                        schema.domains,
                        eq(schema.domains.id, schema.domain_admin.domain_id)
                    )
                    .innerJoin(
                        schema.org_contacts,
                        and(
                            eq(
                                schema.org_contacts.org_id,
                                schema.domains.org_id
                            ),
                            eq(
                                schema.org_contacts.contact_id,
                                schema.domain_admin.contact_id
                            )
                        )
                    )
                    .innerJoin(
                        schema.orgs,
                        eq(schema.orgs.id, schema.domains.org_id)
                    )
                    .where(
                        and(
                            eq(schema.domain_admin.domain_id, domain_id),
                            eq(schema.domain_admin.contact_id, contact_id),
                            eq(schema.domain_admin.status, "active"),
                            isNull(schema.domain_admin.deleted_at),
                            isNull(schema.domains.deleted_at),
                            isNull(schema.orgs.deleted_at),
                            eq(schema.org_contacts.status, "active"),
                            isNull(schema.org_contacts.deleted_at),
                            sql`${schema.domain_admin.role} in ('owner', 'admin')`
                        )
                    )
                    .limit(1)
                    .pipe(
                        Effect.map((rows) => rows[0] !== undefined),
                        // Fail closed: a database error denies rather than admits.
                        Effect.catch(() => Effect.succeed(false))
                    ),
            // platform_admin_role also has 'support' and 'viewer', and
            // AuthPlatformAdmin allows all three — but only sysadmin passes
            // here, so the other two are refused by every platform-admin route.
            isPlatformAdmin: (contact_id) =>
                db
                    .select({ role: schema.platform_admin.role })
                    .from(schema.platform_admin)
                    .where(
                        and(
                            eq(schema.platform_admin.contact_id, contact_id),
                            eq(schema.platform_admin.role, "sysadmin"),
                            eq(schema.platform_admin.status, "active"),
                            isNull(schema.platform_admin.deleted_at)
                        )
                    )
                    .limit(1)
                    .pipe(
                        Effect.map((rows) => rows[0] !== undefined),
                        Effect.catch(() => Effect.succeed(false))
                    ),
        })
    })
)

export const AppRpcAuthMiddlewareLive = Layer.effect(
    AuthenticatedRpcMiddleware,
    Effect.gen(function* () {
        const dependencies = yield* Effect.context<
            DB | AuthConfig | ServerConfig | AuditEventPersistence
        >()

        return AuthenticatedRpcMiddleware.of((effect, { headers }) =>
            Effect.gen(function* () {
                const request = new Request("http://rpc.local/api/rpc", {
                    headers: new globalThis.Headers(headers),
                })
                const authConfig = yield* AuthConfig
                const originalHostname = request.headers.get(
                    "x-urm-original-host"
                )
                const originalOrigin = request.headers.get(
                    "x-urm-original-origin"
                )
                const serverConfig = yield* ServerConfig
                const trustedWorkerRequest = isTrustedDomainWorkerRequest(
                    request.headers,
                    Redacted.value(authConfig.domainWorkerToken)
                )
                const domainWorkerRequest =
                    trustedWorkerRequest &&
                    !(
                        originalOrigin !== null &&
                        isCentralApplicationOrigin(originalOrigin, serverConfig)
                    )

                const domainScope =
                    domainWorkerRequest && originalHostname !== null
                        ? yield* resolveDomainSessionScope(
                              originalHostname
                          ).pipe(
                              Effect.catch(() => Effect.succeed(undefined)),
                              Effect.provide(dependencies)
                          )
                        : undefined
                const domainSession =
                    domainScope === undefined
                        ? undefined
                        : yield* getDomainSession(request, domainScope).pipe(
                              Effect.catch(() => Effect.succeed(undefined)),
                              Effect.provide(dependencies)
                          )
                const contactId = domainWorkerRequest
                    ? domainSession?.contact_id
                    : yield* getAuthSessionContactId(request).pipe(
                          Effect.catch(() => Effect.succeed(undefined)),
                          Effect.provide(dependencies)
                      )

                if (contactId === undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Authentication required",
                        })
                    )
                }

                return yield* Effect.provideService(
                    effect,
                    AuthenticatedRequestContext,
                    {
                        requestId: crypto.randomUUID(),
                        contactId:
                            Schema.decodeUnknownSync(ContactId)(contactId),
                        headers,
                        ...(domainSession?.domain_id === undefined
                            ? {}
                            : { domainId: domainSession.domain_id }),
                        ...(domainSession?.hostname === undefined
                            ? {}
                            : { hostname: domainSession.hostname }),
                    }
                )
            }).pipe(Effect.provide(dependencies))
        )
    })
)

export const AppActiveDomainRpcMiddlewareLive = Layer.effect(
    ActiveDomainRpcMiddleware,
    Effect.gen(function* () {
        const dependencies = yield* Effect.context<DB | AuthConfig>()

        return ActiveDomainRpcMiddleware.of((effect, { headers }) =>
            Effect.gen(function* () {
                const request = new Request("http://rpc.local/api/rpc", {
                    headers: new globalThis.Headers(headers),
                })
                const authConfig = yield* AuthConfig
                const originalHostname = request.headers.get(
                    "x-urm-original-host"
                )

                if (
                    originalHostname === null ||
                    !isTrustedDomainWorkerRequest(
                        request.headers,
                        Redacted.value(authConfig.domainWorkerToken)
                    )
                ) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Domain scope required",
                        })
                    )
                }

                const scope = yield* resolveDomainSessionScope(
                    originalHostname
                ).pipe(
                    Effect.catch(() => Effect.succeed(undefined)),
                    Effect.provide(dependencies)
                )

                if (scope === undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Domain scope required",
                        })
                    )
                }

                return yield* Effect.provideService(
                    effect,
                    ActiveDomainRequestContext,
                    {
                        domainId: scope.domain_id,
                        hostname: scope.hostname,
                    }
                )
            }).pipe(Effect.provide(dependencies))
        )
    })
)

const publicWorkerHostname = (original_host: string): string | undefined => {
    try {
        const hostname = new URL(
            `https://${original_host}`
        ).hostname.toLowerCase()
        return hostname.length === 0 ? undefined : hostname
    } catch {
        return undefined
    }
}

export const PublicWorkerRpcMiddlewareLive = Layer.effect(
    PublicWorkerRpcMiddleware,
    Effect.gen(function* () {
        const auth_config = yield* AuthConfig

        return PublicWorkerRpcMiddleware.of((effect, { headers }) =>
            Effect.gen(function* () {
                const request = new Request("http://rpc.local/api/rpc", {
                    headers: new globalThis.Headers(headers),
                })
                const original_host = request.headers.get("x-urm-original-host")
                const hostname =
                    original_host === null
                        ? undefined
                        : publicWorkerHostname(original_host)

                if (
                    hostname === undefined ||
                    !isTrustedDomainWorkerRequest(
                        request.headers,
                        Redacted.value(auth_config.domainWorkerToken)
                    )
                ) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Trusted public worker required",
                        })
                    )
                }

                return yield* Effect.provideService(
                    effect,
                    PublicWorkerRequestContext,
                    { hostname }
                )
            })
        )
    })
)

export const DomainManagerRpcMiddlewareLive = Layer.effect(
    DomainManagerRpcMiddleware,
    Effect.gen(function* () {
        const authorization = yield* RpcAuthorizationPersistence

        return DomainManagerRpcMiddleware.of((effect) =>
            Effect.gen(function* () {
                const authenticated = yield* AuthenticatedRequestContext
                const activeDomain = yield* ActiveDomainRequestContext
                const permitted = yield* authorization.isDomainManager({
                    domain_id: activeDomain.domainId,
                    contact_id: authenticated.contactId,
                })

                if (!permitted) {
                    return yield* Effect.fail(
                        new AuthorizationError({ message: "Not permitted" })
                    )
                }

                return yield* effect
            })
        )
    })
)

export const PlatformAdminRpcMiddlewareLive = Layer.effect(
    PlatformAdminRpcMiddleware,
    Effect.gen(function* () {
        const authorization = yield* RpcAuthorizationPersistence

        return PlatformAdminRpcMiddleware.of((effect) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const permitted = yield* authorization.isPlatformAdmin(
                    context.contactId
                )

                if (!permitted) {
                    return yield* Effect.fail(
                        new AuthorizationError({ message: "Not permitted" })
                    )
                }

                return yield* effect
            })
        )
    })
)
