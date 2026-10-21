/**
 * # Domain Presence
 *
 * Records that a contact is present on the domain a request arrived at.
 */
import { and, eq, isNull } from "drizzle-orm"
import { Effect } from "effect"
import { DB, schema } from "@urm/db"
import {
    generatedHostSuffix,
    generatedHostSuffixForCentralHostname,
} from "./generated-hosts.ts"

type HeaderRecord = Record<string, string | ReadonlyArray<string> | undefined>
type HeaderSource = Headers | HeaderRecord

export type ResolvedDomain = Readonly<{
    id: string
    name: string
}>

const ROOT_DOMAIN_NAME = "urm"
const ROOT_DOMAIN_HOSTS = ["urm.dev"]
const RESERVED_GENERATED_DOMAIN_NAMES = [
    "urm",
    "www",
    "admin",
    "api",
    "auth",
    "app",
]

const headerValue = (
    headers: HeaderSource,
    name: string
): string | undefined => {
    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined
    }

    const value =
        headers[name] ??
        headers[name.toLowerCase()] ??
        headers[name.toUpperCase()]

    if (typeof value === "string") {
        return value
    }

    return value?.join(", ")
}

const normalizeHostname = (hostname: string): string =>
    hostname.trim().toLowerCase().replace(/\.$/, "").split(":")[0] ?? ""

const hostnameFromHeaders = (
    headers: HeaderSource,
    requestUrl: string
): string => {
    const host = headerValue(headers, "host")

    if (host !== undefined) {
        return normalizeHostname(host)
    }

    return normalizeHostname(new URL(requestUrl).host)
}

const generatedDomainNameFromHostname = (
    hostname: string
): string | undefined => {
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

const findDomainByName = (name: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const domains = yield* db
            .select({ id: schema.domains.id, name: schema.domains.name })
            .from(schema.domains)
            .where(
                and(
                    eq(schema.domains.name, name),
                    isNull(schema.domains.deleted_at)
                )
            )
            .limit(1)

        return domains[0]
    })

const resolveDomainForHeaders = (
    headers: HeaderSource,
    requestUrl: string
): Effect.Effect<ResolvedDomain | undefined, never, DB> =>
    Effect.gen(function* () {
        const hostname = hostnameFromHeaders(headers, requestUrl)

        if (ROOT_DOMAIN_HOSTS.includes(hostname)) {
            return yield* findDomainByName(ROOT_DOMAIN_NAME).pipe(
                Effect.catch(() => Effect.succeed(undefined))
            )
        }

        // A central host is never a tenant. `urm.urm.dev` used to be central
        // and was special-cased here; it is now simply the generated host of
        // the `urm` domain, so it resolves like any other.
        if (generatedHostSuffixForCentralHostname(hostname) !== undefined) {
            return undefined
        }

        const db = yield* DB
        const exactHostnames = yield* db
            .select({ id: schema.domains.id, name: schema.domains.name })
            .from(schema.domain_hostnames)
            .innerJoin(
                schema.domains,
                eq(schema.domain_hostnames.domain_id, schema.domains.id)
            )
            .where(
                and(
                    eq(schema.domain_hostnames.hostname, hostname),
                    isNull(schema.domain_hostnames.deleted_at),
                    isNull(schema.domains.deleted_at)
                )
            )
            .limit(1)
            .pipe(Effect.catch(() => Effect.succeed([])))

        if (exactHostnames[0] !== undefined) {
            return exactHostnames[0]
        }

        const generatedDomainName = generatedDomainNameFromHostname(hostname)
        if (
            generatedDomainName === undefined ||
            generatedDomainName === "" ||
            RESERVED_GENERATED_DOMAIN_NAMES.includes(generatedDomainName)
        ) {
            return undefined
        }

        return yield* findDomainByName(generatedDomainName).pipe(
            Effect.catch(() => Effect.succeed(undefined))
        )
    })

export const ensurePublicDomainPresence = (
    contactId: string,
    headers: HeaderSource,
    requestUrl: string,
    source: string
): Effect.Effect<ResolvedDomain | undefined, never, DB> =>
    Effect.gen(function* () {
        const resolvedDomain = yield* resolveDomainForHeaders(
            headers,
            requestUrl
        )

        if (resolvedDomain === undefined) {
            return undefined
        }

        const db = yield* DB
        const now = new Date()

        const existingDomainContacts = yield* db
            .select({ id: schema.domain_contacts.id })
            .from(schema.domain_contacts)
            .where(
                and(
                    eq(schema.domain_contacts.domain_id, resolvedDomain.id),
                    eq(schema.domain_contacts.contact_id, contactId),
                    isNull(schema.domain_contacts.deleted_at)
                )
            )
            .limit(1)

        const existingDomainContact = existingDomainContacts[0]

        if (existingDomainContact === undefined) {
            yield* db.insert(schema.domain_contacts).values({
                domain_id: resolvedDomain.id,
                contact_id: contactId,
                status: "active",
                source,
                first_seen_at: now,
                last_seen_at: now,
                updated_at: now,
            })
        } else {
            yield* db
                .update(schema.domain_contacts)
                .set({
                    status: "active",
                    source,
                    last_seen_at: now,
                    updated_at: now,
                })
                .where(eq(schema.domain_contacts.id, existingDomainContact.id))
        }

        const existingVisitors = yield* db
            .select({ id: schema.domain_visitors.id })
            .from(schema.domain_visitors)
            .where(
                and(
                    eq(schema.domain_visitors.domain_id, resolvedDomain.id),
                    eq(schema.domain_visitors.contact_id, contactId),
                    isNull(schema.domain_visitors.deleted_at)
                )
            )
            .limit(1)

        const existingVisitor = existingVisitors[0]

        if (existingVisitor === undefined) {
            yield* db.insert(schema.domain_visitors).values({
                domain_id: resolvedDomain.id,
                contact_id: contactId,
                role: "visitor",
                status: "active",
                first_seen_at: now,
                last_seen_at: now,
            })
            return
        }

        yield* db
            .update(schema.domain_visitors)
            .set({ status: "active", last_seen_at: now })
            .where(eq(schema.domain_visitors.id, existingVisitor.id))

        return resolvedDomain
    }).pipe(Effect.catch(() => Effect.succeed(undefined)))
