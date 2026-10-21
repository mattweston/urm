/**
 * # Sessions
 *
 * Central (host-only) contact sessions backed by `auth_sessions`. Per-domain
 * sessions live in ./domain-sessions.ts.
 */
import { createHash, randomBytes } from "node:crypto"
import { and, eq, isNull, ne } from "drizzle-orm"
import { Duration, Effect, Metric } from "effect"
import { DB, schema } from "@urm/database"
import { AuthConfig } from "@urm/env/server"
import {
    AUTH_COOKIE_CLEAR,
    AUTH_COOKIE_OPTS,
    cookieHeader,
} from "./cookies/cookie-opts.ts"
import { parseCookies } from "./cookies/parse-cookies.ts"
import { recordAuditEvent } from "./audit-events.ts"
import { AuthSessionPersistence } from "./auth-session-persistence.ts"

const AUTH_COOKIE_NAME = "auth"

const sessionLookupDuration = Metric.timer("auth_session_lookup_duration_ms")
const sessionRotatedTotal = Metric.counter("auth_session_rotated_total").pipe(
    Metric.withConstantInput(1)
)

const tokenHash = (token: string): string =>
    createHash("sha256").update(token).digest("hex")

const newSessionToken = (): string => randomBytes(32).toString("base64url")

// parseCookies deliberately does not decode, and cookieHeader encoded on the
// way out, so the decode has to happen here.
const sessionTokenFromRequest = (request: Request): string | undefined => {
    const value = parseCookies(request.headers.get("cookie") ?? undefined)[
        AUTH_COOKIE_NAME
    ]

    if (value === undefined) {
        return undefined
    }

    return decodeURIComponent(value)
}

export const createContactAuthSessionCookie = (
    contactId: string,
    request: Request
) =>
    createContactAuthSession(contactId, request).pipe(
        Effect.map((session) => session.cookie)
    )

export const createContactAuthSessionCookieFromHeaders = (
    contactId: string,
    headers: Headers
) =>
    createContactAuthSessionFromHeaders(contactId, headers).pipe(
        Effect.map((session) => session.cookie)
    )

export const createContactAuthSession = (contactId: string, request: Request) =>
    createContactAuthSessionFromHeaders(contactId, request.headers)

export const createContactAuthSessionFromHeaders = (
    contactId: string,
    headers: Headers
) =>
    Effect.gen(function* () {
        const config = yield* AuthConfig
        const db = yield* DB
        const token = newSessionToken()
        const now = Date.now()
        const expires_at = now + config.sessionInactivityTimeoutMs

        const inserted = yield* db
            .insert(schema.auth_sessions)
            .values({
                contact_id: contactId,
                token_hash: tokenHash(token),
                expires_at,
                created_at: now,
                updated_at: now,
                last_seen_at: now,
                last_authenticated_at: now,
                ip_address:
                    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                    headers.get("x-real-ip") ??
                    null,
                user_agent: headers.get("user-agent"),
            })
            .returning({ id: schema.auth_sessions.id })

        yield* Effect.annotateLogs({
            session_id: inserted[0]!.id,
            contact_id: contactId,
        })(Effect.void)
        yield* Effect.annotateSpans({
            session_id: inserted[0]!.id,
            contact_id: contactId,
        })(Effect.void)
        yield* Effect.logDebug("auth.session.created", {
            session_id: inserted[0]!.id,
            contact_id: contactId,
        })

        return {
            cookie: cookieHeader(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTS),
            session_id: inserted[0]!.id,
        }
    }).pipe(
        Effect.withSpan("auth.session.create"),
        Effect.withLogSpan("auth.session.create")
    )

const AUDIT_SESSION_EXPIRED = (
    session: { id: string; contact_id: string },
    request: Request
) =>
    recordAuditEvent({
        action: "auth.session.expired",
        entity_type: "auth.session",
        entity_id: session.id,
        contact_id: session.contact_id,
        request_id: request.headers.get("x-request-id") ?? undefined,
        result: "failed",
        reason_class: "expired_session",
    }).pipe(
        Effect.catch(() =>
            Effect.logWarning("auth.session.expired.audit_failed")
        )
    )

const AUDIT_SESSION_REFRESHED = (
    session_id: string,
    contact_id: string,
    request: Request
) =>
    recordAuditEvent({
        action: "auth.session.refreshed",
        entity_type: "auth.session",
        entity_id: session_id,
        contact_id,
        request_id: request.headers.get("x-request-id") ?? undefined,
        result: "succeeded",
    }).pipe(
        Effect.catch(() =>
            Effect.logWarning("auth.session.refreshed.audit_failed")
        )
    )

export const getAuthSession = (request: Request) =>
    Effect.gen(function* () {
        const start = Date.now()
        const recordElapsed = () =>
            Metric.update(
                sessionLookupDuration,
                Duration.millis(Date.now() - start)
            )

        const token = sessionTokenFromRequest(request)

        if (token === undefined) {
            yield* recordElapsed()
            return undefined
        }

        const config = yield* AuthConfig
        const db = yield* DB
        const sessions = yield* db
            .select()
            .from(schema.auth_sessions)
            .where(
                and(
                    eq(schema.auth_sessions.token_hash, tokenHash(token)),
                    isNull(schema.auth_sessions.domain_id),
                    isNull(schema.auth_sessions.revoked_at)
                )
            )
            .limit(1)

        const session = sessions[0]

        if (session === undefined) {
            yield* recordElapsed()
            return undefined
        }

        yield* Effect.annotateLogs({
            session_id: session.id,
            contact_id: session.contact_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            session_id: session.id,
            contact_id: session.contact_id,
        })(Effect.void)

        const now = Date.now()

        if (session.created_at + config.sessionAbsoluteMaxLifetimeMs <= now) {
            yield* AUDIT_SESSION_EXPIRED(session, request)
            yield* recordElapsed()
            return undefined
        }

        if (session.expires_at <= now) {
            yield* AUDIT_SESSION_EXPIRED(session, request)
            yield* recordElapsed()
            return undefined
        }

        // Clamped to the absolute cap so sliding activity cannot extend a
        // session past created_at + sessionAbsoluteMaxLifetimeMs.
        const new_expires_at = Math.min(
            now + config.sessionInactivityTimeoutMs,
            session.created_at + config.sessionAbsoluteMaxLifetimeMs
        )

        yield* db
            .update(schema.auth_sessions)
            .set({
                expires_at: new_expires_at,
                last_seen_at: now,
                updated_at: now,
            })
            .where(eq(schema.auth_sessions.id, session.id))

        if (new_expires_at > session.expires_at) {
            yield* AUDIT_SESSION_REFRESHED(
                session.id,
                session.contact_id,
                request
            )
        }

        yield* recordElapsed()
        yield* Effect.logDebug("auth.session.lookup.found", {
            session_id: session.id,
            contact_id: session.contact_id,
        })
        return {
            id: session.id,
            contact_id: session.contact_id,
            last_authenticated_at: session.last_authenticated_at,
        }
    }).pipe(
        Effect.withSpan("auth.session.lookup"),
        Effect.withLogSpan("auth.session.lookup")
    )

export const getAuthSessionContactId = (request: Request) =>
    getAuthSession(request).pipe(Effect.map((session) => session?.contact_id))

export type RecentAuthResult =
    | { readonly tag: "ok"; readonly id: string; readonly contact_id: string }
    | { readonly tag: "no_session" }
    | { readonly tag: "too_old" }

export const requireRecentAuth = (request: Request) =>
    Effect.gen(function* () {
        const session = yield* getAuthSession(request)

        if (session === undefined) {
            return { tag: "no_session" } as RecentAuthResult
        }

        const config = yield* AuthConfig

        const lastAuthenticatedAt = session.last_authenticated_at ?? 0

        if (lastAuthenticatedAt + config.recentAuthTimeoutMs <= Date.now()) {
            return { tag: "too_old" } as RecentAuthResult
        }

        yield* Effect.annotateLogs({
            session_id: session.id,
            contact_id: session.contact_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            session_id: session.id,
            contact_id: session.contact_id,
        })(Effect.void)
        return {
            tag: "ok",
            id: session.id,
            contact_id: session.contact_id,
        } as RecentAuthResult
    }).pipe(
        Effect.withSpan("auth.session.recent_auth.check"),
        Effect.withLogSpan("auth.session.recent_auth.check")
    )

const AUDIT_SESSION_ROTATED = (
    session_id: string,
    contact_id: string,
    request: Request
) =>
    recordAuditEvent({
        action: "auth.session.rotated",
        entity_type: "auth.session",
        entity_id: session_id,
        contact_id,
        request_id: request.headers.get("x-request-id") ?? undefined,
    }).pipe(
        Effect.catch(() =>
            Effect.logWarning("auth.session.rotated.audit_failed")
        )
    )

export const rotateAuthSession = (request: Request, contact_id?: string) =>
    Effect.gen(function* () {
        const token = sessionTokenFromRequest(request)

        if (token === undefined) {
            return undefined
        }

        const db = yield* DB
        const existing = yield* db
            .select({
                id: schema.auth_sessions.id,
                contact_id: schema.auth_sessions.contact_id,
            })
            .from(schema.auth_sessions)
            .where(
                and(
                    eq(schema.auth_sessions.token_hash, tokenHash(token)),
                    isNull(schema.auth_sessions.domain_id),
                    isNull(schema.auth_sessions.revoked_at)
                )
            )
            .limit(1)

        const existingSession = existing[0]

        if (existingSession === undefined) {
            return undefined
        }

        // A cookie that authenticates someone other than the contact the caller
        // expects means the two have been mixed up somewhere upstream. Revoke
        // rather than rotate — rotating would hand back a fresh valid token.
        if (
            contact_id !== undefined &&
            existingSession.contact_id !== contact_id
        ) {
            yield* revokeAuthSession(request)
            return undefined
        }

        const newToken = newSessionToken()
        const now = Date.now()

        yield* db
            .update(schema.auth_sessions)
            .set({
                token_hash: tokenHash(newToken),
                rotated_at: now,
                last_authenticated_at: now,
                updated_at: now,
            })
            .where(eq(schema.auth_sessions.id, existingSession.id))

        yield* Effect.annotateLogs({
            session_id: existingSession.id,
            contact_id: existingSession.contact_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            session_id: existingSession.id,
            contact_id: existingSession.contact_id,
        })(Effect.void)
        yield* Metric.update(sessionRotatedTotal, 1)
        yield* AUDIT_SESSION_ROTATED(
            existingSession.id,
            existingSession.contact_id,
            request
        )
        yield* Effect.logDebug("auth.session.rotated", {
            session_id: existingSession.id,
            contact_id: existingSession.contact_id,
        })

        return {
            cookie: cookieHeader(AUTH_COOKIE_NAME, newToken, AUTH_COOKIE_OPTS),
            session_id: existingSession.id,
        }
    }).pipe(
        Effect.withSpan("auth.session.rotate"),
        Effect.withLogSpan("auth.session.rotate")
    )

export const revokeAuthSession = (request: Request) =>
    revokeAuthSessionWithInfo(request).pipe(
        Effect.map((session) => session.cookie)
    )

export const revokeAuthSessionWithInfo = (
    request: Request,
    reason = "logout"
) =>
    Effect.gen(function* () {
        const token = sessionTokenFromRequest(request)

        // Logout must never fail, so a request with no session still gets the
        // clearing cookie — that is how a client sheds a stale value.
        if (token === undefined) {
            return {
                cookie: cookieHeader(AUTH_COOKIE_NAME, "", AUTH_COOKIE_CLEAR),
            }
        }

        const db = yield* DB
        const now = Date.now()
        const session = yield* getAuthSession(request)

        yield* db
            .update(schema.auth_sessions)
            .set({
                revoked_at: now,
                revoked_reason: reason,
                updated_at: now,
            })
            .where(
                and(
                    eq(schema.auth_sessions.token_hash, tokenHash(token)),
                    isNull(schema.auth_sessions.domain_id)
                )
            )

        yield* Effect.annotateLogs({
            session_id: session?.id ?? "none",
            contact_id: session?.contact_id ?? "none",
            reason,
        })(Effect.void)
        yield* Effect.annotateSpans({
            session_id: session?.id ?? "none",
            contact_id: session?.contact_id ?? "none",
            reason,
        })(Effect.void)
        yield* Effect.logDebug("auth.session.revoked", {
            session_id: session?.id ?? "none",
            contact_id: session?.contact_id ?? "none",
            reason,
        })

        return {
            cookie: cookieHeader(AUTH_COOKIE_NAME, "", AUTH_COOKIE_CLEAR),
            session_id: session?.id,
            contact_id: session?.contact_id,
        }
    }).pipe(
        Effect.withSpan("auth.session.revoke"),
        Effect.withLogSpan("auth.session.revoke")
    )

export const revokeContactAuthSessions = (
    contactId: string,
    reason = "contact_sessions_revoked"
) =>
    Effect.gen(function* () {
        const persistence = yield* AuthSessionPersistence
        return yield* persistence.revokeContactSessions({
            contact_id: contactId,
            reason,
            now: Date.now(),
        })
    }).pipe(
        Effect.withSpan("auth.session.revoke_contact"),
        Effect.withLogSpan("auth.session.revoke_contact")
    )

const AUDIT_SESSIONS_REVOKED = (
    contact_id: string,
    count: number,
    session_id: string,
    request: Request
) =>
    recordAuditEvent({
        action: "auth.sessions.revoked",
        entity_type: "auth.session",
        contact_id,
        entity_id: session_id,
        request_id: request.headers.get("x-request-id") ?? undefined,
        metadata: {
            revoked_count: String(count),
            reason: "revoke_other_sessions",
        },
    }).pipe(
        Effect.catch(() =>
            Effect.logWarning("auth.sessions.revoked.audit_failed")
        )
    )

export const revokeOtherContactAuthSessions = (
    contact_id: string,
    request: Request
) =>
    Effect.gen(function* () {
        const current = yield* getAuthSession(request)

        if (current === undefined) {
            return { revoked_count: 0 }
        }

        const db = yield* DB
        const now = Date.now()
        const revoked = yield* db
            .update(schema.auth_sessions)
            .set({
                revoked_at: now,
                revoked_reason: "revoke_other_sessions",
                updated_at: now,
            })
            .where(
                and(
                    eq(schema.auth_sessions.contact_id, contact_id),
                    isNull(schema.auth_sessions.revoked_at),
                    ne(schema.auth_sessions.id, current.id)
                )
            )
            .returning({ id: schema.auth_sessions.id })

        const count = revoked.length

        yield* Effect.annotateLogs({ session_id: current.id, contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ session_id: current.id, contact_id })(
            Effect.void
        )

        if (count > 0) {
            yield* AUDIT_SESSIONS_REVOKED(
                contact_id,
                count,
                current.id,
                request
            )
            yield* Effect.logDebug("auth.sessions.revoked_other", {
                contact_id,
                revoked_count: count,
            })
        }

        return { revoked_count: count }
    }).pipe(
        Effect.withSpan("auth.session.revoke_other"),
        Effect.withLogSpan("auth.session.revoke_other")
    )

export const upsertContactAuthAccount = (
    contactId: string,
    provider: string,
    providerAccountId: string,
    email: string | null
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const now = Date.now()

        // Keyed on the provider account, not the contact: an existing row has
        // its contact_id overwritten, moving the external identity (and every
        // future login through it) to contactId. Only call once the provider
        // has actually authenticated the account.
        const existing = yield* db
            .select()
            .from(schema.auth_accounts)
            .where(
                and(
                    eq(schema.auth_accounts.provider, provider),
                    eq(
                        schema.auth_accounts.provider_account_id,
                        providerAccountId
                    )
                )
            )
            .limit(1)

        if (existing[0] !== undefined) {
            yield* db
                .update(schema.auth_accounts)
                .set({
                    contact_id: contactId,
                    email,
                    updated_at: now,
                })
                .where(eq(schema.auth_accounts.id, existing[0].id))
            return
        }

        yield* db.insert(schema.auth_accounts).values({
            contact_id: contactId,
            provider,
            provider_account_id: providerAccountId,
            email,
            created_at: now,
            updated_at: now,
        })
    }).pipe(
        Effect.withSpan("auth.account.upsert"),
        Effect.withLogSpan("auth.account.upsert")
    )
