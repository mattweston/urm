import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import { Effect } from "effect"
import { DB, databaseOperationError, schema } from "@urm/database"
import { AuthConfig } from "@urm/env/server"
import { recordAuditEvent } from "./audit-events.ts"
import {
    buildDomainSessionCookieOptions,
    cookieHeader,
} from "./cookies/cookie-opts.ts"
import { parseCookies } from "./cookies/parse-cookies.ts"
import {
    generatedHostSuffix,
    generatedHostSuffixForCentralHostname,
} from "./generated-hosts.ts"

const DOMAIN_SESSION_COOKIE_NAME = "urm_domain_session"
const DOMAIN_HANDOFF_TTL_MS = 60_000

export type DomainSessionScope = Readonly<{
    domain_id: string
    hostname: string
    cookie_domain: string
}>

export type DomainSession = Readonly<{
    id: string
    contact_id: string
    domain_id: string
    hostname: string
}>

export type DomainSessionHandoff = Readonly<{
    code: string
    expires_at: number
}>

const hashValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

const normalizeHostname = (value: string): string =>
    value.trim().toLowerCase().replace(/\.$/, "").split(":")[0] ?? ""

const isCentralHostname = (hostname: string): boolean =>
    hostname === "urm.urm.dev"

const routeOrRoot = (route: string): string =>
    route.startsWith("/") && !route.startsWith("//") ? route : "/"

export const generatedDomainName = (hostname: string): string | undefined => {
    const suffix = generatedHostSuffix(hostname)

    if (suffix === undefined) {
        return undefined
    }

    const name = hostname.slice(0, -suffix.length)
    const domainName = name.startsWith("urm.") ? name.slice(4) : name
    return domainName === "" || domainName.includes(".")
        ? undefined
        : domainName
}

const cookieDomainForGeneratedHostname = (
    domain_name: string,
    hostname: string
): string => {
    const suffix = generatedHostSuffix(hostname)

    return suffix === undefined ? hostname : `${domain_name}${suffix}`
}

const isActiveDemoDomain = (domain_id: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const workspaces = yield* db
            .select({
                status: schema.demo_workspaces.status,
                expires_at: schema.demo_workspaces.expires_at,
            })
            .from(schema.demo_workspace_domains)
            .innerJoin(
                schema.demo_workspaces,
                eq(
                    schema.demo_workspace_domains.workspace_id,
                    schema.demo_workspaces.id
                )
            )
            .where(eq(schema.demo_workspace_domains.domain_id, domain_id))
            .limit(1)
        const workspace = workspaces[0]

        return (
            workspace === undefined ||
            (workspace.status === "active" && workspace.expires_at > new Date())
        )
    })

/**
 * Build the generated admin origin from the configured central application
 * origin. This deliberately accepts configuration, not a browser-supplied
 * hostname, so a central session can never be redirected to an arbitrary
 * host.
 */
export const generatedDomainAdminOrigin = (
    domain_name: string,
    central_app_url: string
): string | undefined => {
    const central_url = new URL(central_app_url)
    const suffix = generatedHostSuffixForCentralHostname(central_url.hostname)

    if (suffix === undefined) {
        return undefined
    }

    const port = central_url.port === "" ? "" : `:${central_url.port}`

    // The tenant apex itself, which is where administration is served. Neither
    // the `/urm/` path nor the `urm.<domain>` host before it is used any more.
    return `${central_url.protocol}//${domain_name}${suffix}${port}`
}

/**
 * Build a domain origin from a trusted resolved hostname and the configured
 * central application origin. Generated local hosts retain their dev port;
 * production and custom hosts always use HTTPS.
 */
export const domainSessionOrigin = (
    hostname: string,
    central_app_url: string
): string => {
    const central_url = new URL(central_app_url)
    const port = central_url.port === "" ? "" : `:${central_url.port}`
    const suffix = generatedHostSuffixForCentralHostname(central_url.hostname)

    if (suffix !== undefined && hostname.endsWith(suffix)) {
        return `${central_url.protocol}//${hostname}${port}`
    }

    return `https://${hostname}`
}

/** Resolve only a registered custom hostname or one of the two generated pair. */
export const resolveDomainSessionScope = (hostname: string) =>
    Effect.gen(function* () {
        const normalizedHostname = normalizeHostname(hostname)
        const db = yield* DB

        if (isCentralHostname(normalizedHostname)) {
            return undefined
        }

        const domainName = generatedDomainName(normalizedHostname)

        if (domainName !== undefined) {
            const domains = yield* db
                .select({ id: schema.domains.id, name: schema.domains.name })
                .from(schema.domains)
                .where(
                    and(
                        eq(schema.domains.name, domainName),
                        isNull(schema.domains.deleted_at)
                    )
                )
                .limit(1)
            const domain = domains[0]

            if (domain === undefined) {
                return undefined
            }

            if (!(yield* isActiveDemoDomain(domain.id))) {
                return undefined
            }

            return {
                domain_id: domain.id,
                hostname: normalizedHostname,
                cookie_domain: cookieDomainForGeneratedHostname(
                    domain.name,
                    normalizedHostname
                ),
            }
        }

        const hostnames = yield* db
            .select({
                domain_id: schema.domain_hostnames.domain_id,
                hostname: schema.domain_hostnames.hostname,
                apex_hostname: schema.domain_hostnames.apex_hostname,
            })
            .from(schema.domain_hostnames)
            .innerJoin(
                schema.domains,
                eq(schema.domain_hostnames.domain_id, schema.domains.id)
            )
            .where(
                and(
                    eq(schema.domain_hostnames.hostname, normalizedHostname),
                    eq(schema.domain_hostnames.status, "active"),
                    isNull(schema.domain_hostnames.deleted_at),
                    isNull(schema.domains.deleted_at)
                )
            )
            .limit(1)
        const domainHostname = hostnames[0]

        if (domainHostname === undefined) {
            return undefined
        }

        if (!(yield* isActiveDemoDomain(domainHostname.domain_id))) {
            return undefined
        }

        return {
            domain_id: domainHostname.domain_id,
            hostname: domainHostname.hostname,
            cookie_domain: domainHostname.apex_hostname,
        }
    })

const contactHasDomainRelationship = (contact_id: string, domain_id: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const [domainContacts, domainVisitors, domainCustomers, domainAdmins] =
            yield* Effect.all([
                db
                    .select({ id: schema.domain_contacts.id })
                    .from(schema.domain_contacts)
                    .where(
                        and(
                            eq(schema.domain_contacts.contact_id, contact_id),
                            eq(schema.domain_contacts.domain_id, domain_id),
                            eq(schema.domain_contacts.status, "active"),
                            isNull(schema.domain_contacts.deleted_at)
                        )
                    )
                    .limit(1),
                db
                    .select({ id: schema.domain_visitors.id })
                    .from(schema.domain_visitors)
                    .where(
                        and(
                            eq(schema.domain_visitors.contact_id, contact_id),
                            eq(schema.domain_visitors.domain_id, domain_id),
                            eq(schema.domain_visitors.status, "active"),
                            isNull(schema.domain_visitors.deleted_at)
                        )
                    )
                    .limit(1),
                db
                    .select({ id: schema.domain_customers.id })
                    .from(schema.domain_customers)
                    .where(
                        and(
                            eq(schema.domain_customers.contact_id, contact_id),
                            eq(schema.domain_customers.domain_id, domain_id),
                            eq(schema.domain_customers.status, "active"),
                            isNull(schema.domain_customers.deleted_at)
                        )
                    )
                    .limit(1),
                db
                    .select({ id: schema.domain_admin.id })
                    .from(schema.domain_admin)
                    .where(
                        and(
                            eq(schema.domain_admin.contact_id, contact_id),
                            eq(schema.domain_admin.domain_id, domain_id),
                            eq(schema.domain_admin.status, "active"),
                            isNull(schema.domain_admin.deleted_at)
                        )
                    )
                    .limit(1),
            ])

        return (
            domainContacts[0] !== undefined ||
            domainVisitors[0] !== undefined ||
            domainCustomers[0] !== undefined ||
            domainAdmins[0] !== undefined
        )
    })

const domainSessionCookie = (
    token: string,
    scope: DomainSessionScope
): string =>
    cookieHeader(
        DOMAIN_SESSION_COOKIE_NAME,
        token,
        buildDomainSessionCookieOptions(scope.cookie_domain).auth_cookie_opts
    )

export const createDomainSession = (
    contact_id: string,
    scope: DomainSessionScope,
    headers: Headers
) =>
    Effect.gen(function* () {
        if (
            !(yield* contactHasDomainRelationship(contact_id, scope.domain_id))
        ) {
            return undefined
        }

        const config = yield* AuthConfig
        const db = yield* DB
        const token = randomBytes(32).toString("base64url")
        const now = Date.now()
        const inserted = yield* db
            .insert(schema.auth_sessions)
            .values({
                contact_id,
                token_hash: hashValue(token),
                domain_id: scope.domain_id,
                hostname: scope.hostname,
                cookie_domain: scope.cookie_domain,
                expires_at: now + config.sessionInactivityTimeoutMs,
                created_at: now,
                updated_at: now,
                last_seen_at: now,
                last_authenticated_at: now,
                user_agent: headers.get("user-agent"),
            })
            .returning({ id: schema.auth_sessions.id })
        const session = inserted[0]

        if (session === undefined) {
            return yield* Effect.fail(
                databaseOperationError(
                    "createDomainSession",
                    "Insert returned no row"
                )
            )
        }

        return {
            cookie: domainSessionCookie(token, scope),
            session_id: session.id,
        }
    })

export const getDomainSession = (request: Request, scope: DomainSessionScope) =>
    Effect.gen(function* () {
        const raw = parseCookies(request.headers.get("cookie") ?? undefined)[
            DOMAIN_SESSION_COOKIE_NAME
        ]

        if (raw === undefined) {
            return undefined
        }

        const token = decodeURIComponent(raw)
        const db = yield* DB
        const rows = yield* db
            .select({
                id: schema.auth_sessions.id,
                contact_id: schema.auth_sessions.contact_id,
                domain_id: schema.auth_sessions.domain_id,
                hostname: schema.auth_sessions.hostname,
                cookie_domain: schema.auth_sessions.cookie_domain,
                expires_at: schema.auth_sessions.expires_at,
            })
            .from(schema.auth_sessions)
            .where(
                and(
                    eq(schema.auth_sessions.token_hash, hashValue(token)),
                    eq(schema.auth_sessions.domain_id, scope.domain_id),
                    eq(schema.auth_sessions.cookie_domain, scope.cookie_domain),
                    isNull(schema.auth_sessions.revoked_at),
                    gt(schema.auth_sessions.expires_at, Date.now())
                )
            )
            .limit(1)
        const session = rows[0]

        if (
            session === undefined ||
            session.domain_id === null ||
            session.hostname === null ||
            session.cookie_domain === null
        ) {
            return undefined
        }

        yield* db
            .update(schema.auth_sessions)
            .set({
                last_seen_at: Date.now(),
                updated_at: Date.now(),
            })
            .where(eq(schema.auth_sessions.id, session.id))

        return {
            id: session.id,
            contact_id: session.contact_id,
            domain_id: session.domain_id,
            hostname: session.hostname,
        } satisfies DomainSession
    })

export const createDomainSessionHandoff = (
    contact_id: string,
    scope: DomainSessionScope,
    target_route: string
) =>
    Effect.gen(function* () {
        if (
            !(yield* contactHasDomainRelationship(contact_id, scope.domain_id))
        ) {
            return undefined
        }

        const code = randomBytes(32).toString("base64url")
        const now = Date.now()
        const expires_at = now + DOMAIN_HANDOFF_TTL_MS
        const db = yield* DB
        yield* db.insert(schema.auth_domain_handoffs).values({
            code_hash: hashValue(code),
            contact_id,
            domain_id: scope.domain_id,
            hostname: scope.hostname,
            target_route: routeOrRoot(target_route),
            expires_at,
            created_at: now,
        })
        return { code, expires_at }
    })

export const consumeDomainSessionHandoff = (
    code: string,
    scope: DomainSessionScope,
    headers: Headers
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const now = Date.now()
        const consumed = yield* db
            .update(schema.auth_domain_handoffs)
            .set({ consumed_at: now })
            .where(
                and(
                    eq(schema.auth_domain_handoffs.code_hash, hashValue(code)),
                    eq(schema.auth_domain_handoffs.domain_id, scope.domain_id),
                    eq(schema.auth_domain_handoffs.hostname, scope.hostname),
                    isNull(schema.auth_domain_handoffs.consumed_at),
                    gt(schema.auth_domain_handoffs.expires_at, now)
                )
            )
            .returning({
                id: schema.auth_domain_handoffs.id,
                contact_id: schema.auth_domain_handoffs.contact_id,
                target_route: schema.auth_domain_handoffs.target_route,
            })
        const handoff = consumed[0]

        if (handoff === undefined) {
            return undefined
        }

        const session = yield* createDomainSession(
            handoff.contact_id,
            scope,
            headers
        )

        if (session === undefined) {
            return undefined
        }

        yield* recordAuditEvent({
            action: "auth.domain_handoff.consumed",
            entity_type: "auth.domain_handoff",
            entity_id: handoff.id,
            contact_id: handoff.contact_id,
            domain_id: scope.domain_id,
            session_id: session.session_id,
            metadata: { hostname: scope.hostname },
        }).pipe(Effect.catch(() => Effect.void))

        return { ...session, target_route: handoff.target_route }
    })

export const isTrustedDomainWorkerRequest = (
    headers: Headers,
    token: string
): boolean => {
    const supplied = headers.get("x-urm-domain-worker-token")
    return (
        token !== "" &&
        supplied === token &&
        headers.get("x-urm-original-host") !== null
    )
}

export const isCentralApplicationOrigin = (
    originalOrigin: string,
    config: Readonly<{
        appUrl: string
        adminAppUrl: string
        marketingAppUrl: string
    }>
): boolean => {
    try {
        const origin = new URL(originalOrigin).origin

        return [config.appUrl, config.adminAppUrl, config.marketingAppUrl].some(
            (configuredUrl) => new URL(configuredUrl).origin === origin
        )
    } catch {
        return false
    }
}
