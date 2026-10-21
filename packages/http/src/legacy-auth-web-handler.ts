import {
    createEmailDelivery,
    markEmailDeliveryFailed,
    markEmailDeliverySent,
    markEmailDeliverySkipped,
    type DeliveryPersistence,
    type EmailSql,
    type EmailDeliveryPurpose,
} from "@urm/email/postgres"
import { createHash, randomUUID } from "node:crypto"
import { Context, Effect, Layer, Metric, Redacted, Schema } from "effect"
import { and, eq, isNull } from "drizzle-orm"
import {
    createContactAuthSession,
    getAuthSessionContactId,
    requireRecentAuth,
    revokeContactAuthSessions,
    revokeAuthSessionWithInfo,
    revokeOtherContactAuthSessions,
    rotateAuthSession,
    upsertContactAuthAccount,
} from "@urm/auth/sessions"
import {
    recordAuditEvent,
    type AuditEventInput,
    type AuditEventPersistence,
    type AuditEventReasonClass,
} from "@urm/auth/audit-events"
import { ensurePublicDomainPresence } from "@urm/auth/domain-presence"
import {
    recordObservabilityLog,
    type ObservabilityLogPersistence,
} from "@urm/auth/observability-logs"
import {
    consumeEmailChangeToken,
    consumeEmailVerificationToken,
    createEmailChangeToken,
    createEmailVerificationToken,
    EMAIL_VERIFICATION_TOKEN_TTL_MS,
} from "@urm/auth/email-verification"
import {
    createPasswordCredential,
    findActivePasswordCredential,
    replacePasswordCredential,
    verifyPasswordCredential,
} from "@urm/auth/password-credentials"
import {
    consumeDomainSessionHandoff,
    createDomainSessionHandoff,
    domainSessionOrigin,
    isCentralApplicationOrigin,
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
    type DomainSessionScope,
} from "@urm/auth/domain-sessions"
import { generatedHostSuffix } from "@urm/auth/generated-hosts"
import {
    verifyDomainLoginIntent,
    type DomainLoginIntent,
} from "@urm/auth/domain-login-intent"
import {
    consumePasswordResetToken,
    createPasswordResetToken,
    findActivePasswordResetToken,
    PASSWORD_RESET_TOKEN_TTL_MS,
} from "@urm/auth/password-reset"
import {
    validatePasswordSafety,
    type PasswordSafetyResult,
} from "@urm/auth/password-safety"
import {
    authRateLimitKey,
    checkAuthRateLimit,
    type AuthRateLimitDecision,
} from "@urm/auth/rate-limiter"
import { type AuthPersistence } from "@urm/auth/auth-persistence"
import { AuthSessionPersistence } from "@urm/auth/auth-session-persistence"
import { PasswordCredentialPersistence } from "@urm/auth/password-credential-persistence"
import {
    AuthResponse,
    CredentialsLoginInput,
    CredentialsSignUpInput,
    EmailChangeConfirmInput,
    EmailChangeInput,
    EmailVerificationConfirmInput,
    EmailVerificationRequestInput,
    PasswordChangeInput,
    PasswordResetConfirmInput,
    PasswordResetRequestInput,
} from "@urm/contracts/auth-legacy"
import { DB, schema } from "@urm/database"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import {
    authEmailVerificationTemplate,
    authPasswordChangedTemplate,
    emailVerificationUrl,
    authPasswordResetTemplate,
    passwordResetUrl,
    EmailTransport,
    type EmailSendResult,
} from "@urm/email"
import { demoCredentialsPolicy } from "./demo-credentials-policy.ts"
import { RequestDecodeError } from "./web-handler-errors.ts"

type ContactRow = typeof schema.contacts.$inferSelect
type AuthHandlerEffect = Effect.Effect<
    Response,
    never,
    | DB
    | AuthConfig
    | ServerConfig
    | EmailTransport
    | DeliveryPersistence
    | EmailSql
    | AuthPersistence
    | AuthSessionPersistence
    | PasswordCredentialPersistence
    | PasswordResetConfirmation
    | AuditEventPersistence
    | ObservabilityLogPersistence
>

export type PasswordResetConfirmationShape = {
    readonly handle: (
        request: Request,
        input: typeof PasswordResetConfirmInput.Type
    ) => AuthHandlerEffect
}

// The one route resolved through context rather than called directly, so a test
// can stub the half that consumes a single-use token and writes a credential.
export class PasswordResetConfirmation extends Context.Service<
    PasswordResetConfirmation,
    PasswordResetConfirmationShape
>()("@urm/http/PasswordResetConfirmation") {}

const FALLBACK_PASSWORD = "password"
const DEFAULT_FALLBACK_NAME = "Demo Contact"
const ROOT_DOMAIN_NAME = "urm"
const ROOT_DOMAIN_HOSTS = ["localhost", "urm.dev"]
const RESERVED_GENERATED_DOMAIN_NAMES = [
    "urm",
    "www",
    "admin",
    "api",
    "auth",
    "app",
]
const REQUEST_ID_HEADER = "x-request-id"
const CLIENT_IP_HASH_HEADER = "x-urm-client-ip-hash"
const USER_AGENT_HASH_HEADER = "x-urm-user-agent-hash"

const authLoginAttemptsTotal = Metric.counter("auth_login_attempts_total").pipe(
    Metric.withConstantInput(1)
)
const authSignupAttemptsTotal = Metric.counter(
    "auth_signup_attempts_total"
).pipe(Metric.withConstantInput(1))
const authSessionCreatedTotal = Metric.counter(
    "auth_session_created_total"
).pipe(Metric.withConstantInput(1))
const authSessionRevokedTotal = Metric.counter(
    "auth_session_revoked_total"
).pipe(Metric.withConstantInput(1))
const authSessionsRevokedTotal = Metric.counter(
    "auth_sessions_revoked_total"
).pipe(Metric.withConstantInput(1))
const authRateLimitBlockedTotal = Metric.counter(
    "auth_rate_limit_blocked_total"
).pipe(Metric.withConstantInput(1))
const authEmailVerificationRequestedTotal = Metric.counter(
    "auth_email_verification_requested_total"
).pipe(Metric.withConstantInput(1))
const authPasswordResetRequestedTotal = Metric.counter(
    "auth_password_reset_requested_total"
).pipe(Metric.withConstantInput(1))
const CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS = 300
const CREDENTIAL_RATE_LIMIT_BLOCK_SECONDS = 900
const CREDENTIAL_RATE_LIMIT_MAX_ATTEMPTS = 10
const RECOVERY_REQUEST_RATE_LIMIT_WINDOW_SECONDS = 3600
const RECOVERY_REQUEST_RATE_LIMIT_BLOCK_SECONDS = 3600
const RECOVERY_REQUEST_RATE_LIMIT_MAX_ATTEMPTS = 5
const RECOVERY_CONFIRM_RATE_LIMIT_WINDOW_SECONDS = 300
const RECOVERY_CONFIRM_RATE_LIMIT_BLOCK_SECONDS = 900
const RECOVERY_CONFIRM_RATE_LIMIT_MAX_ATTEMPTS = 10
const CLOUDFLARE_EMAIL_PROVIDER = "cloudflare"

type AuthRateLimitedRoute =
    | "login"
    | "sign-up"
    | "email-verification-request"
    | "email-verification-confirm"
    | "password-reset-request"
    | "password-reset-confirm"
    | "password-change"
    | "email-change-request"
    | "email-change-confirm"

type AuthRateLimitConfig = Readonly<{
    limit: number
    window_seconds: number
    block_seconds: number
}>

type ResolvedDomain = Readonly<{
    id: string
    name: string
}>

type AuthContext = Readonly<{
    platform_admin?:
        | {
              role: "sysadmin" | "support" | "viewer"
          }
        | undefined
    current_domain?:
        | {
              id: string
              name: string
              admin_role?:
                  | "owner"
                  | "admin"
                  | "editor"
                  | "support"
                  | "viewer"
                  | undefined
          }
        | undefined
}>

export type EmailDeliveryOutcome =
    | Readonly<{ status: "sent" }>
    | Readonly<{ status: "skipped"; reason: string }>
    | Readonly<{ status: "failed" }>

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: new Headers({
            ...Object.fromEntries(new Headers(init?.headers).entries()),
            "Content-Type": "application/json; charset=utf-8",
        }),
    })

const authJsonResponse = (
    body: typeof AuthResponse.Type,
    cookieValue?: string
): Response => {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
    })

    if (cookieValue !== undefined) {
        headers.set("Set-Cookie", cookieValue)
    }

    return new Response(JSON.stringify(body), { status: 200, headers })
}

const hashedAuditValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

const normalizedEmailHash = (email: string): string =>
    hashedAuditValue(email.trim().toLowerCase())

const requestId = (request: Request): string | undefined =>
    request.headers.get(REQUEST_ID_HEADER) ?? undefined

const authTelemetryContext = (
    request: Request,
    auth_route: string
): Record<string, string> => {
    const context: Record<string, string> = {
        auth_provider: "credentials",
        auth_route,
    }
    const currentRequestId = requestId(request)

    if (currentRequestId !== undefined) {
        context.request_id = currentRequestId
    }

    return context
}

const authAuditMetadata = (
    request: Request,
    auth_route: string
): Record<string, string> => {
    const metadata: Record<string, string> = {
        auth_provider: "credentials",
        auth_route,
    }
    const clientIpHash = request.headers.get(CLIENT_IP_HASH_HEADER)
    const userAgentHash = request.headers.get(USER_AGENT_HASH_HEADER)

    if (clientIpHash !== null) {
        metadata.client_ip_hash = clientIpHash
    }

    if (userAgentHash !== null) {
        metadata.user_agent_hash = userAgentHash
    }

    return metadata
}

const tokenContext = (
    request: Request
): {
    request_ip_hash?: string | undefined
    user_agent_hash?: string | undefined
} => {
    const request_ip_hash =
        request.headers.get(CLIENT_IP_HASH_HEADER) ?? undefined
    const user_agent_hash =
        request.headers.get(USER_AGENT_HASH_HEADER) ?? undefined

    return {
        request_ip_hash,
        user_agent_hash,
    }
}

const recordAuthAuditEvent = (input: AuditEventInput) =>
    recordAuditEvent(input).pipe(
        Effect.catchCause(() => Effect.logWarning("auth.audit.write_failed"))
    )

const incrementLoginAttempts = (
    result: "succeeded" | "failed",
    reason_class: AuditEventReasonClass | "none"
) =>
    Effect.track(
        Effect.void,
        authLoginAttemptsTotal.pipe(
            Metric.withAttributes({
                provider: "credentials",
                result,
                reason_class,
            })
        )
    )

const incrementSignupAttempts = (
    result: "succeeded" | "failed",
    reason_class: AuditEventReasonClass | "none"
) =>
    Effect.track(
        Effect.void,
        authSignupAttemptsTotal.pipe(
            Metric.withAttributes({
                result,
                reason_class,
            })
        )
    )

const incrementSessionCreated = () =>
    Effect.track(
        Effect.void,
        authSessionCreatedTotal.pipe(
            Metric.withAttributes({
                provider: "credentials",
            })
        )
    )

const incrementSessionRevoked = (reason: string) =>
    Effect.track(
        Effect.void,
        authSessionRevokedTotal.pipe(Metric.withAttributes({ reason }))
    )

const incrementSessionsRevoked = (reason: string, count: number) =>
    Effect.track(
        Effect.void,
        authSessionsRevokedTotal.pipe(
            Metric.withAttributes({ reason, count: String(count) })
        )
    )

const incrementRateLimitBlocked = (route: string) =>
    Effect.track(
        Effect.void,
        authRateLimitBlockedTotal.pipe(Metric.withAttributes({ route }))
    )

const incrementEmailVerificationRequested = () =>
    Effect.track(Effect.void, authEmailVerificationRequestedTotal)

const incrementPasswordResetRequested = () =>
    Effect.track(Effect.void, authPasswordResetRequestedTotal)

const deniedDemoCredentialsResponse = () =>
    jsonResponse({ error: "Credentials auth unavailable" }, { status: 403 })

const auditDemoCredentialsDenied = (
    request: Request,
    auth_route: "login" | "sign-up",
    email: string
) =>
    recordAuthAuditEvent({
        action: "auth.policy.denied",
        entity_type: "auth.credentials",
        request_id: requestId(request),
        result: "blocked",
        reason_class: "policy_denied",
        metadata: {
            ...authAuditMetadata(request, auth_route),
            email_hash: normalizedEmailHash(email),
            policy: "demo_credentials_disabled_in_production",
        },
    })

const rateLimitBlockedResponse = (retry_after_seconds: number): Response =>
    jsonResponse(
        { error: "Too many requests" },
        {
            status: 429,
            headers: { "Retry-After": String(retry_after_seconds) },
        }
    )

const emailDeliveryOutcome = (
    result: EmailSendResult
): EmailDeliveryOutcome => {
    if (result.status === "sent") {
        return { status: "sent" }
    }

    return { status: "skipped", reason: result.reason }
}

const failedEmailDeliveryOutcome = (): EmailDeliveryOutcome => ({
    status: "failed",
})

// Mail is a side effect of the primary operation, so a provider outage must not
// turn a successful password change into a 500. The error channel is `never`;
// `skipped` keeps its reason so the audit trail can tell "feature off" from
// "provider rejected it".
export const resolveEmailDeliveryOutcome = <Error>(
    send: Effect.Effect<EmailSendResult, Error>
): Effect.Effect<EmailDeliveryOutcome> =>
    send.pipe(
        Effect.map(emailDeliveryOutcome),
        Effect.catch(() => Effect.succeed(failedEmailDeliveryOutcome()))
    )

const createTrackedEmailDelivery = (
    input: Readonly<{
        purpose: EmailDeliveryPurpose
        template_id: string
        contact_id: string
        to: string
        subject: string
        auth_route:
            | "email-verification-request"
            | "password-reset-request"
            | "password-reset-confirm"
            | "email-change-request"
        request_id?: string | undefined
    }>
) =>
    createEmailDelivery({
        purpose: input.purpose,
        template_id: input.template_id,
        provider: CLOUDFLARE_EMAIL_PROVIDER,
        contact_id: input.contact_id,
        to: input.to,
        subject: input.subject,
        metadata: {
            auth_provider: "credentials",
            auth_route: input.auth_route,
            request_id: input.request_id,
        },
    }).pipe(
        Effect.map((delivery) => delivery?.id),
        Effect.catchCause(() =>
            Effect.gen(function* () {
                yield* Effect.logWarning("email.delivery.create_failed", {
                    purpose: input.purpose,
                    auth_route: input.auth_route,
                })
                return undefined
            })
        )
    )

const markTrackedEmailDeliveryOutcome = (
    delivery_id: string | undefined,
    outcome: EmailDeliveryOutcome
) => {
    if (delivery_id === undefined) {
        return Effect.void
    }

    const update =
        outcome.status === "sent"
            ? markEmailDeliverySent(delivery_id)
            : outcome.status === "skipped"
              ? markEmailDeliverySkipped(delivery_id, outcome.reason)
              : markEmailDeliveryFailed(delivery_id, "provider_send_failed")

    return update.pipe(
        Effect.catchCause(() =>
            Effect.logWarning("email.delivery.update_failed", { delivery_id })
        )
    )
}

const authLoginUrl = (app_url: string): string =>
    `${app_url.replace(/\/$/, "")}/auth/login/`

const sendTrackedPasswordChangedEmail = (
    input: Readonly<{
        contact_id: string
        email: string
        request_id?: string | undefined
    }>
) =>
    Effect.gen(function* () {
        const emailTransport = yield* EmailTransport
        const serverConfig = yield* ServerConfig
        const email = authPasswordChangedTemplate.render({
            to: input.email,
            login_url: authLoginUrl(serverConfig.appUrl),
        })
        const deliveryId = yield* createTrackedEmailDelivery({
            purpose: "auth_password_changed",
            template_id: authPasswordChangedTemplate.id,
            contact_id: input.contact_id,
            to: input.email,
            subject: email.subject,
            auth_route: "password-reset-confirm",
            request_id: input.request_id,
        })
        const deliveryOutcome = yield* resolveEmailDeliveryOutcome(
            emailTransport.send(email)
        )

        yield* markTrackedEmailDeliveryOutcome(deliveryId, deliveryOutcome)
    }).pipe(
        Effect.catchCause(() =>
            Effect.logWarning("auth.password_changed.email_delivery_failed", {
                contact_id: input.contact_id,
            })
        )
    )

const recordAuthEmailDelivery = (
    request: Request,
    auth_route:
        | "email-verification-request"
        | "password-reset-request"
        | "email-change-request",
    action: string,
    contact: ContactRow,
    email_hash: string,
    outcome: EmailDeliveryOutcome
) =>
    recordAuthAuditEvent({
        action,
        entity_type: "email.delivery",
        entity_id: contact.id,
        actor_contact_id: contact.id,
        contact_id: contact.id,
        request_id: requestId(request),
        result: outcome.status === "failed" ? "failed" : "succeeded",
        reason_class:
            outcome.status === "failed" ? "internal_error" : undefined,
        metadata: {
            ...authAuditMetadata(request, auth_route),
            email_hash,
            delivery_status: outcome.status,
            delivery_skipped_reason:
                outcome.status === "skipped" ? outcome.reason : undefined,
            provider: "cloudflare",
        },
    })

const minutesFromMs = (value: number): number => Math.floor(value / (1000 * 60))

const authRateLimitConfig = (
    route: AuthRateLimitedRoute
): AuthRateLimitConfig => {
    switch (route) {
        case "login":
        case "sign-up":
            return {
                limit: CREDENTIAL_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: CREDENTIAL_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "email-verification-request":
        case "password-reset-request":
            return {
                limit: RECOVERY_REQUEST_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: RECOVERY_REQUEST_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: RECOVERY_REQUEST_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "email-verification-confirm":
        case "password-reset-confirm":
            return {
                limit: RECOVERY_CONFIRM_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: RECOVERY_CONFIRM_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: RECOVERY_CONFIRM_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "password-change":
            return {
                limit: CREDENTIAL_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: CREDENTIAL_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "email-change-request":
            return {
                limit: RECOVERY_REQUEST_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: RECOVERY_REQUEST_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: RECOVERY_REQUEST_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "email-change-confirm":
            return {
                limit: RECOVERY_CONFIRM_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: RECOVERY_CONFIRM_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: RECOVERY_CONFIRM_RATE_LIMIT_BLOCK_SECONDS,
            }
    }
}

const validateNewPassword = (password: string) =>
    Effect.gen(function* () {
        const authConfig = yield* AuthConfig

        return yield* validatePasswordSafety(password, {
            pwned_passwords_enabled: authConfig.pwnedPasswordsEnabled,
            pwned_passwords_fail_closed: authConfig.pwnedPasswordsFailClosed,
            pwned_passwords_timeout_ms: authConfig.pwnedPasswordsTimeoutMs,
            pwned_passwords_cache_ttl_ms: authConfig.pwnedPasswordsCacheTtlMs,
        })
    })

const passwordSafetyFailureResponse = (
    request: Request,
    auth_route: "sign-up" | "password-reset-confirm" | "password-change",
    action:
        | "auth.signup.failed"
        | "auth.password_reset.completed"
        | "auth.password_credential.changed",
    entity_type: "auth.signup" | "auth_password_credential",
    safety: PasswordSafetyResult,
    contact_id?: string
) =>
    Effect.gen(function* () {
        if (safety.valid) {
            return undefined
        }

        yield* Effect.logWarning("auth.policy.denied", {
            policy: "password_safety",
            reason_class: "validation_failed",
            password_safety_reason: safety.reason,
            contact_id: contact_id ?? "none",
        })
        yield* recordObservabilityLog({
            level: "warning",
            message: "auth.policy.denied",
            source: auth_route,
            contact_id,
            metadata: {
                policy: "password_safety",
                reason_class: "validation_failed",
                password_safety_reason: safety.reason,
            },
        }).pipe(Effect.catch(() => Effect.void))
        yield* recordAuthAuditEvent({
            action,
            entity_type,
            contact_id,
            request_id: requestId(request),
            result: "failed",
            reason_class: "validation_failed",
            metadata: {
                ...authAuditMetadata(request, auth_route),
                password_safety_reason: safety.reason,
            },
        })

        return jsonResponse({ error: "Invalid password" }, { status: 400 })
    })

const checkAuthRouteRateLimit = (
    request: Request,
    auth_route: AuthRateLimitedRoute,
    key_parts: ReadonlyArray<string>,
    metadata: Record<string, string> = {}
) =>
    Effect.gen(function* () {
        const clientIpHash =
            request.headers.get(CLIENT_IP_HASH_HEADER) ?? "unknown_ip"
        const key = authRateLimitKey([auth_route, clientIpHash, ...key_parts])
        const config = authRateLimitConfig(auth_route)
        const decision = yield* checkAuthRateLimit({
            route: auth_route,
            key,
            limit: config.limit,
            window_seconds: config.window_seconds,
            block_seconds: config.block_seconds,
        }).pipe(
            Effect.catch(() =>
                Effect.gen(function* () {
                    yield* Effect.logWarning("auth.rate_limit.check_failed", {
                        auth_route,
                    })
                    return { allowed: true } satisfies AuthRateLimitDecision
                })
            )
        )

        if (decision.allowed) {
            return undefined
        }

        yield* incrementRateLimitBlocked(auth_route)
        yield* Effect.logWarning("auth.rate_limited", {
            route: auth_route,
            key_hash: key,
        })
        yield* recordAuthAuditEvent({
            action: "auth.rate_limit.blocked",
            entity_type: "auth.rate_limit",
            request_id: requestId(request),
            result: "blocked",
            reason_class: "rate_limited",
            metadata: {
                ...authAuditMetadata(request, auth_route),
                ...metadata,
                key_hash: key,
            },
        })

        return rateLimitBlockedResponse(decision.retry_after_seconds)
    })

const checkCredentialRateLimit = (
    request: Request,
    auth_route: "login" | "sign-up",
    email_hash: string
) => checkAuthRouteRateLimit(request, auth_route, [email_hash], { email_hash })

const ensureDemoCredentialsAllowed = (
    request: Request,
    auth_route: "login" | "sign-up",
    email: string
) =>
    Effect.gen(function* () {
        const authConfig = yield* AuthConfig
        const policy = demoCredentialsPolicy(authConfig.demoCredentialsEnabled)

        if (policy.allowed) {
            return undefined
        }

        if (auth_route === "login") {
            yield* incrementLoginAttempts("failed", policy.reason_class)
        } else {
            yield* incrementSignupAttempts("failed", policy.reason_class)
        }

        yield* Effect.logWarning("auth.policy.denied", {
            policy: "demo_credentials",
            reason_class: policy.reason_class,
            auth_route,
        })
        yield* recordObservabilityLog({
            level: "warning",
            message: "auth.policy.denied",
            source: auth_route,
            metadata: {
                policy: "demo_credentials",
                reason_class: policy.reason_class,
            },
        }).pipe(Effect.catch(() => Effect.void))
        yield* auditDemoCredentialsDenied(request, auth_route, email)

        return deniedDemoCredentialsResponse()
    })

const normalizeHostname = (hostname: string): string =>
    hostname.trim().toLowerCase().replace(/\.$/, "").split(":")[0] ?? ""

const hostnameFromRequest = (request: Request): string => {
    const headerHost = request.headers.get("host")
    if (headerHost !== null) {
        return normalizeHostname(headerHost)
    }

    return normalizeHostname(new URL(request.url).host)
}

const generatedDomainNameFromHostname = (
    hostname: string
): string | undefined => {
    const suffix = generatedHostSuffix(hostname)

    return suffix === undefined ? undefined : hostname.slice(0, -suffix.length)
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

const resolveDomainForRequest = (
    request: Request
): Effect.Effect<ResolvedDomain | undefined, never, DB> =>
    Effect.gen(function* () {
        const hostname = hostnameFromRequest(request)

        if (ROOT_DOMAIN_HOSTS.includes(hostname)) {
            return yield* findDomainByName(ROOT_DOMAIN_NAME).pipe(
                Effect.catch(() => Effect.succeed(undefined))
            )
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

const loadAuthContext = (
    contactId: string,
    request: Request
): Effect.Effect<AuthContext, never, DB> =>
    Effect.gen(function* () {
        const db = yield* DB
        const platformAdmins = yield* db
            .select({ role: schema.platform_admin.role })
            .from(schema.platform_admin)
            .where(
                and(
                    eq(schema.platform_admin.contact_id, contactId),
                    eq(schema.platform_admin.status, "active"),
                    isNull(schema.platform_admin.deleted_at)
                )
            )
            .limit(1)
            .pipe(Effect.catch(() => Effect.succeed([])))

        const resolvedDomain = yield* resolveDomainForRequest(request)

        if (resolvedDomain === undefined) {
            return {
                platform_admin: platformAdmins[0],
            }
        }

        const domainAdmins = yield* db
            .select({ role: schema.domain_admin.role })
            .from(schema.domain_admin)
            .where(
                and(
                    eq(schema.domain_admin.domain_id, resolvedDomain.id),
                    eq(schema.domain_admin.contact_id, contactId),
                    eq(schema.domain_admin.status, "active"),
                    isNull(schema.domain_admin.deleted_at)
                )
            )
            .limit(1)
            .pipe(Effect.catch(() => Effect.succeed([])))

        return {
            platform_admin: platformAdmins[0],
            current_domain: {
                id: resolvedDomain.id,
                name: resolvedDomain.name,
                admin_role: domainAdmins[0]?.role,
            },
        }
    })

const ensureFallbackContact = (email: string, name: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const now = Date.now()

        const existingContactsByEmail = yield* db
            .select()
            .from(schema.contacts)
            .where(eq(schema.contacts.email, email))
            .limit(1)
        const existing = existingContactsByEmail[0]

        if (existing === undefined) {
            const inserted = yield* db
                .insert(schema.contacts)
                .values({
                    id: `contact-${randomUUID()}`,
                    email,
                    name,
                    email_verified: true,
                    is_test_contact: true,
                    created_at: now,
                    updated_at: now,
                })
                .returning()

            return inserted[0]!
        }

        const updated = yield* db
            .update(schema.contacts)
            .set({
                email,
                name,
                email_verified: true,
                is_test_contact: true,
                updated_at: now,
            })
            .where(eq(schema.contacts.id, existing.id))
            .returning()

        return updated[0] ?? existing
    })

const ensureCredentialsAccount = (contact: ContactRow) =>
    upsertContactAuthAccount(
        contact.id,
        "credentials",
        contact.email ?? contact.id,
        contact.email
    )

const findContactById = (id: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const contacts = yield* db
            .select()
            .from(schema.contacts)
            .where(eq(schema.contacts.id, id))
            .limit(1)

        return contacts[0]
    })

const findContactByEmail = (email: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const contacts = yield* db
            .select()
            .from(schema.contacts)
            .where(eq(schema.contacts.email, email))
            .limit(1)

        return contacts[0]
    })

const toAuthResponse = (
    contact: ContactRow,
    context: AuthContext
): typeof AuthResponse.Type => ({
    session: {
        authenticated: true,
        contact: {
            id: contact.id,
            email: contact.email ?? undefined,
            name: contact.name,
        },
        platform_admin: context.platform_admin,
        current_domain: context.current_domain,
    },
})

const emptyAuthResponse = (): typeof AuthResponse.Type => ({
    session: { authenticated: false },
})

const genericEmailVerificationRequestResponse = (): Response =>
    jsonResponse({ ok: true }, { status: 200 })

const genericPasswordResetRequestResponse = (): Response =>
    jsonResponse({ ok: true }, { status: 200 })

const readJson = (request: Request) =>
    Effect.tryPromise({
        try: () => request.json(),
        catch: (cause) => new RequestDecodeError({ cause }),
    })

const handleLogin = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(CredentialsLoginInput)(
            yield* readJson(request)
        )
        const emailHash = normalizedEmailHash(input.email)
        const rateLimitResponse = yield* checkCredentialRateLimit(
            request,
            "login",
            emailHash
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const existingContact = yield* findContactByEmail(input.email)
        const activePasswordCredential =
            existingContact === undefined
                ? undefined
                : yield* findActivePasswordCredential(existingContact.id)

        if (activePasswordCredential !== undefined) {
            const verified = yield* verifyPasswordCredential(
                activePasswordCredential.contact_id,
                input.password
            )

            if (!verified) {
                yield* incrementLoginAttempts("failed", "invalid_credentials")
                yield* Effect.logWarning("auth.login.failed", {
                    reason_class: "invalid_credentials",
                    email_hash: emailHash,
                })
                yield* recordAuthAuditEvent({
                    action: "auth.login.failed",
                    entity_type: "auth.login",
                    contact_id: activePasswordCredential.contact_id,
                    request_id: requestId(request),
                    result: "failed",
                    reason_class: "invalid_credentials",
                    metadata: {
                        ...authAuditMetadata(request, "login"),
                        email_hash: emailHash,
                    },
                })
                return jsonResponse(
                    { error: "Invalid credentials" },
                    { status: 401 }
                )
            }
        }

        if (
            activePasswordCredential === undefined &&
            input.password !== FALLBACK_PASSWORD
        ) {
            yield* incrementLoginAttempts("failed", "invalid_credentials")
            yield* Effect.logWarning("auth.login.failed", {
                reason_class: "invalid_credentials",
                email_hash: emailHash,
            })
            yield* recordAuthAuditEvent({
                action: "auth.login.failed",
                entity_type: "auth.login",
                request_id: requestId(request),
                result: "failed",
                reason_class: "invalid_credentials",
                metadata: {
                    ...authAuditMetadata(request, "login"),
                    email_hash: emailHash,
                },
            })
            return jsonResponse(
                { error: "Invalid credentials" },
                { status: 401 }
            )
        }

        if (activePasswordCredential === undefined) {
            const deniedResponse = yield* ensureDemoCredentialsAllowed(
                request,
                "login",
                input.email
            )

            if (deniedResponse !== undefined) {
                return deniedResponse
            }
        }

        const contact =
            existingContact ??
            (yield* ensureFallbackContact(input.email, DEFAULT_FALLBACK_NAME))
        yield* ensureCredentialsAccount(contact)
        const loginDomain = yield* ensurePublicDomainPresence(
            contact.id,
            request.headers,
            request.url,
            "credentials_login"
        )

        if (loginDomain !== undefined) {
            yield* Effect.annotateLogs({ domain_id: loginDomain.id })(
                Effect.void
            )
            yield* Effect.annotateSpans({ domain_id: loginDomain.id })(
                Effect.void
            )
        }

        const rotated = yield* rotateAuthSession(request, contact.id)
        const session =
            rotated ?? (yield* createContactAuthSession(contact.id, request))
        yield* Effect.annotateLogs({
            contact_id: contact.id,
            session_id: session.session_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: contact.id,
            session_id: session.session_id,
        })(Effect.void)
        yield* incrementLoginAttempts("succeeded", "none")
        yield* incrementSessionCreated()
        yield* Effect.logInfo("auth.login.succeeded", {
            contact_id: contact.id,
            session_id: session.session_id,
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.login.succeeded",
            source: "login",
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "login"),
        }).pipe(Effect.catch(() => Effect.void))
        yield* recordAuthAuditEvent({
            action: "auth.login.succeeded",
            entity_type: "contact",
            entity_id: contact.id,
            actor_contact_id: contact.id,
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "login"),
        })
        yield* recordAuthAuditEvent({
            action: "auth.session.created",
            entity_type: "auth.session",
            entity_id: session.session_id,
            actor_contact_id: contact.id,
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "login"),
        })
        yield* Effect.logDebug("auth.session.created", {
            contact_id: contact.id,
            session_id: session.session_id,
        })
        const domainHandoff = yield* credentialDomainHandoffRedirect(
            request,
            contact.id,
            input.domain_login_intent
        )

        if (domainHandoff !== undefined) {
            return domainHandoff
        }
        const context = yield* loadAuthContext(contact.id, request)
        return authJsonResponse(
            toAuthResponse(contact, context),
            session.cookie
        )
    }).pipe(
        Effect.annotateLogs(authTelemetryContext(request, "login")),
        Effect.annotateSpans(authTelemetryContext(request, "login")),
        Effect.withLogSpan("auth.login"),
        Effect.withSpan("auth.login"),
        Effect.tapError(() => Effect.logWarning("auth.login.request_failed")),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse(
                    { error: "Invalid login request" },
                    { status: 400 }
                )
            )
        )
    )

const handleSignUp = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(CredentialsSignUpInput)(
            yield* readJson(request)
        )
        const emailHash = normalizedEmailHash(input.email)
        const rateLimitResponse = yield* checkCredentialRateLimit(
            request,
            "sign-up",
            emailHash
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const existingContact = yield* findContactByEmail(input.email)
        const existingPasswordCredential =
            existingContact === undefined
                ? undefined
                : yield* findActivePasswordCredential(existingContact.id)

        if (
            existingContact !== undefined &&
            existingPasswordCredential !== undefined
        ) {
            const verified = yield* verifyPasswordCredential(
                existingContact.id,
                input.password
            )

            if (!verified) {
                yield* incrementSignupAttempts("failed", "invalid_credentials")
                yield* Effect.logWarning("auth.signup.failed", {
                    reason_class: "invalid_credentials",
                    email_hash: emailHash,
                })
                yield* recordAuthAuditEvent({
                    action: "auth.signup.failed",
                    entity_type: "auth.signup",
                    contact_id: existingContact.id,
                    request_id: requestId(request),
                    result: "failed",
                    reason_class: "invalid_credentials",
                    metadata: {
                        ...authAuditMetadata(request, "sign-up"),
                        email_hash: emailHash,
                    },
                })
                return jsonResponse(
                    { error: "Invalid sign-up request" },
                    { status: 400 }
                )
            }
        }

        if (existingPasswordCredential === undefined) {
            const passwordSafety = yield* validateNewPassword(input.password)
            const failureResponse = yield* passwordSafetyFailureResponse(
                request,
                "sign-up",
                "auth.signup.failed",
                "auth.signup",
                passwordSafety,
                existingContact?.id
            )

            if (failureResponse !== undefined) {
                yield* incrementSignupAttempts("failed", "validation_failed")
                return failureResponse
            }
        }

        const contact =
            existingContact ??
            (yield* ensureFallbackContact(input.email, input.name))
        const shouldCreatePasswordCredential =
            existingPasswordCredential === undefined
        yield* ensureCredentialsAccount(contact)
        if (shouldCreatePasswordCredential) {
            yield* createPasswordCredential(contact.id, input.password)
        }
        const signupDomain = yield* ensurePublicDomainPresence(
            contact.id,
            request.headers,
            request.url,
            "credentials_signup"
        )

        if (signupDomain !== undefined) {
            yield* Effect.annotateLogs({ domain_id: signupDomain.id })(
                Effect.void
            )
            yield* Effect.annotateSpans({ domain_id: signupDomain.id })(
                Effect.void
            )
        }

        const rotated = yield* rotateAuthSession(request, contact.id)
        const session =
            rotated ?? (yield* createContactAuthSession(contact.id, request))
        yield* Effect.annotateLogs({
            contact_id: contact.id,
            session_id: session.session_id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: contact.id,
            session_id: session.session_id,
        })(Effect.void)
        yield* incrementSignupAttempts("succeeded", "none")
        yield* incrementSessionCreated()
        yield* Effect.logInfo("auth.signup.succeeded", {
            contact_id: contact.id,
            session_id: session.session_id,
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.signup.succeeded",
            source: "sign-up",
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "sign-up"),
        }).pipe(Effect.catch(() => Effect.void))
        yield* recordAuthAuditEvent({
            action: "auth.signup.succeeded",
            entity_type: "contact",
            entity_id: contact.id,
            actor_contact_id: contact.id,
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "sign-up"),
        })
        yield* recordAuthAuditEvent({
            action: "auth.session.created",
            entity_type: "auth.session",
            entity_id: session.session_id,
            actor_contact_id: contact.id,
            contact_id: contact.id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "sign-up"),
        })
        yield* Effect.logDebug("auth.session.created", {
            contact_id: contact.id,
            session_id: session.session_id,
        })
        if (shouldCreatePasswordCredential) {
            yield* recordAuthAuditEvent({
                action: "auth.password_credential.created",
                entity_type: "auth_password_credential",
                actor_contact_id: contact.id,
                contact_id: contact.id,
                session_id: session.session_id,
                request_id: requestId(request),
                metadata: authAuditMetadata(request, "sign-up"),
            })
        }
        const domainHandoff = yield* credentialDomainHandoffRedirect(
            request,
            contact.id,
            input.domain_login_intent
        )

        if (domainHandoff !== undefined) {
            return domainHandoff
        }
        const context = yield* loadAuthContext(contact.id, request)
        return authJsonResponse(
            toAuthResponse(contact, context),
            session.cookie
        )
    }).pipe(
        Effect.annotateLogs(authTelemetryContext(request, "sign-up")),
        Effect.annotateSpans(authTelemetryContext(request, "sign-up")),
        Effect.withLogSpan("auth.signup"),
        Effect.withSpan("auth.signup"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse(
                    { error: "Invalid sign-up request" },
                    { status: 400 }
                )
            )
        )
    )

const handleMe = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const contactId = yield* getAuthSessionContactId(request)

        if (contactId === undefined) {
            return authJsonResponse(emptyAuthResponse())
        }

        const contact = yield* findContactById(contactId)

        if (contact === undefined) {
            return authJsonResponse(emptyAuthResponse())
        }

        yield* Effect.annotateLogs({ contact_id: contact.id })(Effect.void)
        yield* Effect.annotateSpans({ contact_id: contact.id })(Effect.void)
        const meDomain = yield* ensurePublicDomainPresence(
            contact.id,
            request.headers,
            request.url,
            "session"
        )

        if (meDomain !== undefined) {
            yield* Effect.annotateLogs({ domain_id: meDomain.id })(Effect.void)
            yield* Effect.annotateSpans({ domain_id: meDomain.id })(Effect.void)
        }

        const context = yield* loadAuthContext(contact.id, request)
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.me.succeeded",
            source: "me",
            contact_id: contact.id,
            domain_id: meDomain?.id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "me"),
        }).pipe(Effect.catch(() => Effect.void))
        return authJsonResponse(toAuthResponse(contact, context))
    }).pipe(
        Effect.annotateLogs(authTelemetryContext(request, "me")),
        Effect.annotateSpans(authTelemetryContext(request, "me")),
        Effect.withLogSpan("auth.me"),
        Effect.withSpan("auth.me"),
        Effect.catch(() =>
            Effect.succeed(authJsonResponse(emptyAuthResponse()))
        )
    )

const handleLogout = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const session = yield* revokeAuthSessionWithInfo(request)

        if (session.contact_id !== undefined) {
            yield* Effect.annotateLogs({
                contact_id: session.contact_id,
                session_id: session.session_id ?? "none",
            })(Effect.void)
            yield* Effect.annotateSpans({
                contact_id: session.contact_id,
                session_id: session.session_id ?? "none",
            })(Effect.void)
        }

        yield* incrementSessionRevoked("logout")
        yield* Effect.logDebug("auth.session.revoked", {
            reason: "logout",
            contact_id: session.contact_id ?? "none",
            session_id: session.session_id ?? "none",
        })

        yield* recordObservabilityLog({
            level: "info",
            message: "auth.logout.succeeded",
            source: "logout",
            contact_id: session.contact_id ?? undefined,
            session_id: session.session_id ?? undefined,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "logout"),
        }).pipe(Effect.catch(() => Effect.void))
        yield* Effect.logInfo(
            "auth.logout.succeeded",
            session.contact_id === undefined
                ? {}
                : {
                      contact_id: session.contact_id,
                      session_id: session.session_id,
                  }
        )
        yield* recordAuthAuditEvent({
            action: "auth.logout.succeeded",
            entity_type: "auth.session",
            entity_id: session.session_id,
            actor_contact_id: session.contact_id,
            contact_id: session.contact_id,
            session_id: session.session_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "logout"),
        })
        return authJsonResponse(emptyAuthResponse(), session.cookie)
    }).pipe(
        Effect.annotateLogs(authTelemetryContext(request, "logout")),
        Effect.annotateSpans(authTelemetryContext(request, "logout")),
        Effect.withLogSpan("auth.logout"),
        Effect.withSpan("auth.logout"),
        Effect.catch(() =>
            Effect.succeed(authJsonResponse(emptyAuthResponse()))
        )
    )

const DomainHandoffInput = Schema.Struct({
    code: Schema.String,
})

/** The trusted domain worker exchanges a browser handoff for a scoped cookie. */
const handleDomainHandoff = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const authConfig = yield* AuthConfig

        if (
            !isTrustedDomainWorkerRequest(
                request.headers,
                Redacted.value(authConfig.domainWorkerToken)
            )
        ) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        const originalHostname = request.headers.get("x-urm-original-host")
        const scope =
            originalHostname === null
                ? undefined
                : yield* resolveDomainSessionScope(originalHostname).pipe(
                      Effect.catch(() => Effect.succeed(undefined))
                  )

        if (scope === undefined) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        const input = yield* Schema.decodeUnknownEffect(DomainHandoffInput)(
            yield* readJson(request)
        )
        const handoff = yield* consumeDomainSessionHandoff(
            input.code,
            scope,
            request.headers
        ).pipe(Effect.catch(() => Effect.succeed(undefined)))

        if (handoff === undefined) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        return jsonResponse(
            { target_route: handoff.target_route },
            {
                headers: {
                    "Set-Cookie": handoff.cookie,
                    "Cache-Control": "no-store",
                },
            }
        )
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse({ error: "Not found" }, { status: 404 })
            )
        )
    )

/** Redirect a verified domain credential flow through a one-time handoff. */
const credentialDomainHandoffRedirect = (
    request: Request,
    contact_id: string,
    domain_login_intent: DomainLoginIntent | undefined
) =>
    Effect.gen(function* () {
        const authConfig = yield* AuthConfig
        const serverConfig = yield* ServerConfig
        const originalHostname = request.headers.get("x-urm-original-host")
        const originalOrigin = request.headers.get("x-urm-original-origin")
        const trustedDomainWorker = isTrustedDomainWorkerRequest(
            request.headers,
            Redacted.value(authConfig.domainWorkerToken)
        )

        if (trustedDomainWorker) {
            // The merged Astro app proxies central credential requests too.
            // Those requests need the ordinary central session response, not
            // a tenant handoff. The assertion headers are only trusted after
            // the worker-token check above.
            if (
                originalOrigin !== null &&
                isCentralApplicationOrigin(originalOrigin, serverConfig)
            ) {
                return undefined
            }

            const workerScope =
                originalHostname === null
                    ? undefined
                    : yield* resolveDomainSessionScope(originalHostname).pipe(
                          Effect.catch(() => Effect.succeed(undefined))
                      )

            if (workerScope === undefined) {
                return jsonResponse({ error: "Not found" }, { status: 404 })
            }

            return yield* createCredentialDomainHandoff(
                contact_id,
                workerScope,
                domain_login_intent?.destination ?? "marketing"
            )
        }

        if (domain_login_intent === undefined) {
            return undefined
        }

        if (
            !verifyDomainLoginIntent(
                domain_login_intent,
                Redacted.value(authConfig.domainWorkerToken)
            )
        ) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        const scope = yield* resolveDomainSessionScope(
            domain_login_intent.hostname
        ).pipe(Effect.catch(() => Effect.succeed(undefined)))

        if (scope === undefined) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        return yield* createCredentialDomainHandoff(
            contact_id,
            scope,
            domain_login_intent.destination
        )
    })

const createCredentialDomainHandoff = (
    contact_id: string,
    scope: DomainSessionScope,
    destination: DomainLoginIntent["destination"]
) =>
    Effect.gen(function* () {
        const server_config = yield* ServerConfig
        const central_app_url =
            destination === "admin"
                ? server_config.adminAppUrl
                : server_config.appUrl
        const domain_origin = domainSessionOrigin(
            scope.hostname,
            central_app_url
        )

        yield* ensurePublicDomainPresence(
            contact_id,
            new Headers({ host: scope.hostname }),
            new URL("/auth/handoff", domain_origin).toString(),
            "credentials_auth"
        )
        const handoff = yield* createDomainSessionHandoff(
            contact_id,
            scope,
            "/"
        ).pipe(Effect.catch(() => Effect.succeed(undefined)))

        if (handoff === undefined) {
            return jsonResponse({ error: "Not found" }, { status: 404 })
        }

        return new Response(null, {
            status: 302,
            headers: {
                Location: new URL(
                    `/auth/handoff?code=${encodeURIComponent(handoff.code)}`,
                    domain_origin
                ).toString(),
                "Cache-Control": "no-store",
            },
        })
    })

const handleEmailVerificationRequest = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(
            EmailVerificationRequestInput
        )(yield* readJson(request))
        const emailHash = normalizedEmailHash(input.email)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "email-verification-request",
            [emailHash],
            { email_hash: emailHash }
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const contact = yield* findContactByEmail(input.email)

        if (contact !== undefined && contact.email !== null) {
            yield* Effect.annotateLogs({ contact_id: contact.id })(Effect.void)
            yield* Effect.annotateSpans({ contact_id: contact.id })(Effect.void)
            const emailTransport = yield* EmailTransport
            const verificationToken = yield* createEmailVerificationToken(
                contact.id,
                contact.email,
                tokenContext(request)
            )
            yield* incrementEmailVerificationRequested()
            const serverConfig = yield* ServerConfig
            const email = authEmailVerificationTemplate.render({
                to: contact.email,
                verification_url: emailVerificationUrl(
                    serverConfig.appUrl,
                    verificationToken.token
                ),
                expires_minutes: minutesFromMs(EMAIL_VERIFICATION_TOKEN_TTL_MS),
            })
            const deliveryId = yield* createTrackedEmailDelivery({
                purpose: "auth_email_verification",
                template_id: authEmailVerificationTemplate.id,
                contact_id: contact.id,
                to: contact.email,
                subject: email.subject,
                auth_route: "email-verification-request",
                request_id: requestId(request),
            })
            const deliveryOutcome = yield* resolveEmailDeliveryOutcome(
                emailTransport.send(email)
            )

            yield* markTrackedEmailDeliveryOutcome(deliveryId, deliveryOutcome)

            yield* recordAuthEmailDelivery(
                request,
                "email-verification-request",
                "auth.email_verification.email_delivery",
                contact,
                emailHash,
                deliveryOutcome
            )
            yield* recordAuthAuditEvent({
                action: "auth.email_verification.requested",
                entity_type: "contact",
                entity_id: contact.id,
                actor_contact_id: contact.id,
                contact_id: contact.id,
                request_id: requestId(request),
                metadata: {
                    ...authAuditMetadata(request, "email-verification-request"),
                    email_hash: emailHash,
                },
            })
            yield* recordObservabilityLog({
                level: "info",
                message: "auth.email_verification.requested",
                source: "email-verification-request",
                contact_id: contact.id,
                request_id: requestId(request),
                metadata: {
                    email_hash: emailHash,
                    delivery_outcome: deliveryOutcome,
                },
            }).pipe(Effect.catch(() => Effect.void))
        } else {
            yield* recordAuthAuditEvent({
                action: "auth.email_verification.requested",
                entity_type: "contact",
                request_id: requestId(request),
                metadata: {
                    ...authAuditMetadata(request, "email-verification-request"),
                    email_hash: emailHash,
                    result_visibility: "generic_no_contact",
                },
            })
            yield* recordObservabilityLog({
                level: "info",
                message: "auth.email_verification.requested",
                source: "email-verification-request",
                request_id: requestId(request),
                metadata: {
                    email_hash: emailHash,
                    result_visibility: "generic_no_contact",
                },
            }).pipe(Effect.catch(() => Effect.void))
        }

        return genericEmailVerificationRequestResponse()
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "email-verification-request")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "email-verification-request")
        ),
        Effect.withLogSpan("auth.email_verification.request"),
        Effect.withSpan("auth.email_verification.request"),
        Effect.catch(() =>
            Effect.succeed(genericEmailVerificationRequestResponse())
        )
    )

const handleEmailVerificationConfirm = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(
            EmailVerificationConfirmInput
        )(yield* readJson(request))
        const tokenHash = hashedAuditValue(input.token)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "email-verification-confirm",
            [tokenHash]
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const consumed = yield* consumeEmailVerificationToken(input.token)

        if (consumed === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.email_verification.completed",
                entity_type: "contact",
                request_id: requestId(request),
                result: "failed",
                reason_class: "validation_failed",
                metadata: authAuditMetadata(
                    request,
                    "email-verification-confirm"
                ),
            })
            yield* recordObservabilityLog({
                level: "warning",
                message: "auth.email_verification.completed",
                source: "email-verification-confirm",
                request_id: requestId(request),
                metadata: {
                    result: "failed",
                    reason_class: "validation_failed",
                },
            }).pipe(Effect.catch(() => Effect.void))
            return jsonResponse(
                { error: "Invalid verification token" },
                { status: 400 }
            )
        }

        yield* Effect.annotateLogs({ contact_id: consumed.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ contact_id: consumed.contact_id })(
            Effect.void
        )
        yield* recordAuthAuditEvent({
            action: "auth.email_verification.completed",
            entity_type: "contact",
            entity_id: consumed.contact_id,
            actor_contact_id: consumed.contact_id,
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "email-verification-confirm"),
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.email_verification.completed",
            source: "email-verification-confirm",
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: { result: "succeeded" },
        }).pipe(Effect.catch(() => Effect.void))

        return jsonResponse({ ok: true }, { status: 200 })
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "email-verification-confirm")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "email-verification-confirm")
        ),
        Effect.withLogSpan("auth.email_verification.confirm"),
        Effect.withSpan("auth.email_verification.confirm"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse(
                    { error: "Invalid verification request" },
                    { status: 400 }
                )
            )
        )
    )

const handlePasswordResetRequest = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(
            PasswordResetRequestInput
        )(yield* readJson(request))
        const emailHash = normalizedEmailHash(input.email)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "password-reset-request",
            [emailHash],
            { email_hash: emailHash }
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const contact = yield* findContactByEmail(input.email)

        if (contact !== undefined && contact.email !== null) {
            yield* Effect.annotateLogs({ contact_id: contact.id })(Effect.void)
            yield* Effect.annotateSpans({ contact_id: contact.id })(Effect.void)
            const emailTransport = yield* EmailTransport
            const resetToken = yield* createPasswordResetToken(
                contact.id,
                contact.email,
                tokenContext(request)
            )
            yield* incrementPasswordResetRequested()
            const serverConfig = yield* ServerConfig
            const email = authPasswordResetTemplate.render({
                to: contact.email,
                reset_url: passwordResetUrl(
                    serverConfig.appUrl,
                    resetToken.token
                ),
                expires_minutes: minutesFromMs(PASSWORD_RESET_TOKEN_TTL_MS),
            })
            const deliveryId = yield* createTrackedEmailDelivery({
                purpose: "auth_password_reset",
                template_id: authPasswordResetTemplate.id,
                contact_id: contact.id,
                to: contact.email,
                subject: email.subject,
                auth_route: "password-reset-request",
                request_id: requestId(request),
            })
            const deliveryOutcome = yield* resolveEmailDeliveryOutcome(
                emailTransport.send(email)
            )

            yield* markTrackedEmailDeliveryOutcome(deliveryId, deliveryOutcome)

            yield* recordAuthEmailDelivery(
                request,
                "password-reset-request",
                "auth.password_reset.email_delivery",
                contact,
                emailHash,
                deliveryOutcome
            )
            yield* recordAuthAuditEvent({
                action: "auth.password_reset.requested",
                entity_type: "contact",
                entity_id: contact.id,
                actor_contact_id: contact.id,
                contact_id: contact.id,
                request_id: requestId(request),
                metadata: {
                    ...authAuditMetadata(request, "password-reset-request"),
                    email_hash: emailHash,
                },
            })
            yield* recordObservabilityLog({
                level: "info",
                message: "auth.password_reset.requested",
                source: "password-reset-request",
                contact_id: contact.id,
                request_id: requestId(request),
                metadata: {
                    email_hash: emailHash,
                    delivery_outcome: deliveryOutcome,
                },
            }).pipe(Effect.catch(() => Effect.void))
        } else {
            yield* recordAuthAuditEvent({
                action: "auth.password_reset.requested",
                entity_type: "contact",
                request_id: requestId(request),
                metadata: {
                    ...authAuditMetadata(request, "password-reset-request"),
                    email_hash: emailHash,
                    result_visibility: "generic_no_contact",
                },
            })
            yield* recordObservabilityLog({
                level: "info",
                message: "auth.password_reset.requested",
                source: "password-reset-request",
                request_id: requestId(request),
                metadata: {
                    email_hash: emailHash,
                    result_visibility: "generic_no_contact",
                },
            }).pipe(Effect.catch(() => Effect.void))
        }

        return genericPasswordResetRequestResponse()
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "password-reset-request")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "password-reset-request")
        ),
        Effect.withLogSpan("auth.password_reset.request"),
        Effect.withSpan("auth.password_reset.request"),
        Effect.catch(() =>
            Effect.succeed(genericPasswordResetRequestResponse())
        )
    )

const handlePasswordResetConfirmLive = (
    request: Request,
    input: typeof PasswordResetConfirmInput.Type
): AuthHandlerEffect =>
    Effect.gen(function* () {
        const tokenHash = hashedAuditValue(input.token)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "password-reset-confirm",
            [tokenHash]
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const activeResetToken = yield* findActivePasswordResetToken(
            input.token
        )

        if (activeResetToken === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.password_reset.completed",
                entity_type: "auth_password_credential",
                request_id: requestId(request),
                result: "failed",
                reason_class: "validation_failed",
                metadata: authAuditMetadata(request, "password-reset-confirm"),
            })
            yield* recordObservabilityLog({
                level: "warning",
                message: "auth.password_reset.completed",
                source: "password-reset-confirm",
                request_id: requestId(request),
                metadata: {
                    result: "failed",
                    reason_class: "validation_failed",
                },
            }).pipe(Effect.catchCause(() => Effect.void))
            return jsonResponse(
                { error: "Invalid reset token" },
                { status: 400 }
            )
        }

        yield* Effect.annotateLogs({ contact_id: activeResetToken.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({
            contact_id: activeResetToken.contact_id,
        })(Effect.void)
        const passwordSafety = yield* validateNewPassword(input.password)
        const failureResponse = yield* passwordSafetyFailureResponse(
            request,
            "password-reset-confirm",
            "auth.password_reset.completed",
            "auth_password_credential",
            passwordSafety,
            activeResetToken.contact_id
        )

        if (failureResponse !== undefined) {
            return failureResponse
        }

        const consumed = yield* consumePasswordResetToken(input.token)

        if (consumed === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.password_reset.completed",
                entity_type: "auth_password_credential",
                contact_id: activeResetToken.contact_id,
                request_id: requestId(request),
                result: "failed",
                reason_class: "validation_failed",
                metadata: authAuditMetadata(request, "password-reset-confirm"),
            })
            yield* recordObservabilityLog({
                level: "warning",
                message: "auth.password_reset.completed",
                source: "password-reset-confirm",
                contact_id: activeResetToken.contact_id,
                request_id: requestId(request),
                metadata: {
                    result: "failed",
                    reason_class: "validation_failed",
                    stage: "consume",
                },
            }).pipe(Effect.catchCause(() => Effect.void))
            return jsonResponse(
                { error: "Invalid reset token" },
                { status: 400 }
            )
        }

        yield* replacePasswordCredential(consumed.contact_id, input.password)
        const revokedSessions = yield* revokeContactAuthSessions(
            consumed.contact_id,
            "password_reset"
        )
        if (revokedSessions.revoked_count > 0) {
            yield* incrementSessionRevoked("password_reset")
            yield* Effect.logDebug("auth.session.revoked", {
                reason: "password_reset",
                contact_id: consumed.contact_id,
                revoked_count: revokedSessions.revoked_count,
            })
        }
        yield* recordAuthAuditEvent({
            action: "auth.password_reset.completed",
            entity_type: "auth_password_credential",
            actor_contact_id: consumed.contact_id,
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "password-reset-confirm"),
        })
        yield* recordAuthAuditEvent({
            action: "auth.sessions.revoked",
            entity_type: "auth.session",
            actor_contact_id: consumed.contact_id,
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: {
                ...authAuditMetadata(request, "password-reset-confirm"),
                reason: "password_reset",
                revoked_count: String(revokedSessions.revoked_count),
            },
        })
        yield* recordAuthAuditEvent({
            action: "auth.password_credential.changed",
            entity_type: "auth_password_credential",
            actor_contact_id: consumed.contact_id,
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: authAuditMetadata(request, "password-reset-confirm"),
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.password_reset.completed",
            source: "password-reset-confirm",
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: { result: "succeeded" },
        }).pipe(Effect.catchCause(() => Effect.void))
        yield* sendTrackedPasswordChangedEmail({
            contact_id: consumed.contact_id,
            email: consumed.email,
            request_id: requestId(request),
        })

        return jsonResponse({ ok: true }, { status: 200 })
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "password-reset-confirm")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "password-reset-confirm")
        ),
        Effect.withLogSpan("auth.password_reset.confirm"),
        Effect.withSpan("auth.password_reset.confirm"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse(
                    { error: "Invalid reset request" },
                    { status: 400 }
                )
            )
        )
    )

export const PasswordResetConfirmationLive = Layer.succeed(
    PasswordResetConfirmation,
    PasswordResetConfirmation.of({ handle: handlePasswordResetConfirmLive })
)

const handlePasswordResetConfirm = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(
            PasswordResetConfirmInput
        )(yield* readJson(request))
        const confirmation = yield* PasswordResetConfirmation
        return yield* confirmation.handle(request, input)
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "password-reset-confirm")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "password-reset-confirm")
        ),
        Effect.withLogSpan("auth.password_reset.confirm"),
        Effect.withSpan("auth.password_reset.confirm"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse(
                    { error: "Invalid reset request" },
                    { status: 400 }
                )
            )
        )
    )

const handleRevokeOtherSessions = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const auth = yield* requireRecentAuth(request)

        if (auth.tag === "no_session") {
            return jsonResponse({ error: "Unauthorized" }, { status: 401 })
        }

        if (auth.tag === "too_old") {
            return jsonResponse(
                {
                    error: "Recent authentication required",
                    reason: "recent_auth_required",
                },
                { status: 403 }
            )
        }

        yield* Effect.annotateLogs({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        const result = yield* revokeOtherContactAuthSessions(
            auth.contact_id,
            request
        )
        yield* incrementSessionsRevoked(
            "revoke_other_sessions",
            result.revoked_count
        )
        yield* Effect.logInfo("auth.sessions.revoked_other", {
            contact_id: auth.contact_id,
            revoked_count: result.revoked_count,
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.sessions.revoked_other",
            source: "revoke-other-sessions",
            contact_id: auth.contact_id,
            session_id: auth.id,
            request_id: requestId(request),
            metadata: { revoked_count: result.revoked_count },
        }).pipe(Effect.catch(() => Effect.void))

        return jsonResponse(
            { ok: true, revoked_count: result.revoked_count },
            { status: 200 }
        )
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "revoke-other-sessions")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "revoke-other-sessions")
        ),
        Effect.withLogSpan("auth.sessions.revoke_other"),
        Effect.withSpan("auth.sessions.revoke_other"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse({ error: "Invalid request" }, { status: 400 })
            )
        )
    )

const handlePasswordChange = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const auth = yield* requireRecentAuth(request)

        if (auth.tag === "no_session") {
            return jsonResponse({ error: "Unauthorized" }, { status: 401 })
        }

        if (auth.tag === "too_old") {
            return jsonResponse(
                {
                    error: "Recent authentication required",
                    reason: "recent_auth_required",
                },
                { status: 403 }
            )
        }

        yield* Effect.annotateLogs({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        const input = yield* Schema.decodeUnknownEffect(PasswordChangeInput)(
            yield* readJson(request)
        )
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "password-change",
            [auth.contact_id]
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const contact = yield* findContactById(auth.contact_id)

        if (contact === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.password_credential.changed",
                entity_type: "contact",
                actor_contact_id: auth.contact_id,
                contact_id: auth.contact_id,
                session_id: auth.id,
                request_id: requestId(request),
                result: "failed",
                reason_class: "unknown_contact",
                metadata: authAuditMetadata(request, "password-change"),
            })
            return jsonResponse({ error: "Invalid request" }, { status: 400 })
        }

        const verified = yield* verifyPasswordCredential(
            auth.contact_id,
            input.current_password
        )

        if (!verified) {
            yield* recordAuthAuditEvent({
                action: "auth.password_credential.changed",
                entity_type: "auth_password_credential",
                entity_id: input.current_password.length.toString(),
                contact_id: auth.contact_id,
                session_id: auth.id,
                request_id: requestId(request),
                result: "failed",
                reason_class: "invalid_password",
                metadata: authAuditMetadata(request, "password-change"),
            })
            yield* recordObservabilityLog({
                level: "warning",
                message: "auth.password_credential.changed",
                source: "password-change",
                contact_id: auth.contact_id,
                session_id: auth.id,
                request_id: requestId(request),
                metadata: {
                    result: "failed",
                    reason_class: "invalid_password",
                },
            }).pipe(Effect.catch(() => Effect.void))
            return jsonResponse(
                { error: "Invalid current password" },
                { status: 401 }
            )
        }

        const passwordSafety = yield* validateNewPassword(input.new_password)
        const auditAction = "auth.password_credential.changed"
        const failureResponse = yield* passwordSafetyFailureResponse(
            request,
            "password-change",
            auditAction,
            "auth_password_credential",
            passwordSafety,
            auth.contact_id
        )

        if (failureResponse !== undefined) {
            return failureResponse
        }

        yield* replacePasswordCredential(auth.contact_id, input.new_password)

        yield* recordAuthAuditEvent({
            action: auditAction,
            entity_type: "auth_password_credential",
            contact_id: auth.contact_id,
            session_id: auth.id,
            request_id: requestId(request),
            result: "succeeded",
            metadata: authAuditMetadata(request, "password-change"),
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.password_credential.changed",
            source: "password-change",
            contact_id: auth.contact_id,
            session_id: auth.id,
            request_id: requestId(request),
            metadata: { result: "succeeded" },
        }).pipe(Effect.catch(() => Effect.void))

        yield* sendTrackedPasswordChangedEmail({
            contact_id: auth.contact_id,
            email: contact.email ?? auth.contact_id,
            request_id: requestId(request),
        })

        return jsonResponse({ ok: true }, { status: 200 })
    }).pipe(
        Effect.annotateLogs(authTelemetryContext(request, "password-change")),
        Effect.annotateSpans(authTelemetryContext(request, "password-change")),
        Effect.withLogSpan("auth.password_credential.change"),
        Effect.withSpan("auth.password_credential.change"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse({ error: "Invalid request" }, { status: 400 })
            )
        )
    )

const handleEmailChangeRequest = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const auth = yield* requireRecentAuth(request)

        if (auth.tag === "no_session") {
            return jsonResponse({ error: "Unauthorized" }, { status: 401 })
        }

        if (auth.tag === "too_old") {
            return jsonResponse(
                {
                    error: "Recent authentication required",
                    reason: "recent_auth_required",
                },
                { status: 403 }
            )
        }

        yield* Effect.annotateLogs({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        yield* Effect.annotateSpans({
            contact_id: auth.contact_id,
            session_id: auth.id,
        })(Effect.void)
        const input = yield* Schema.decodeUnknownEffect(EmailChangeInput)(
            yield* readJson(request)
        )
        const emailHash = normalizedEmailHash(input.new_email)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "email-change-request",
            [emailHash],
            { email_hash: emailHash }
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const contact = yield* findContactById(auth.contact_id)

        if (contact === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.email_change.requested",
                entity_type: "contact",
                actor_contact_id: auth.contact_id,
                contact_id: auth.contact_id,
                session_id: auth.id,
                request_id: requestId(request),
                result: "failed",
                reason_class: "unknown_contact",
                metadata: authAuditMetadata(request, "email-change-request"),
            })
            return jsonResponse({ error: "Invalid request" }, { status: 400 })
        }

        const emailTransport = yield* EmailTransport
        const changeToken = yield* createEmailChangeToken(
            auth.contact_id,
            input.new_email,
            tokenContext(request)
        )
        const serverConfig = yield* ServerConfig
        const email = authEmailVerificationTemplate.render({
            to: input.new_email,
            verification_url: emailVerificationUrl(
                serverConfig.appUrl,
                changeToken.token
            ),
            expires_minutes: minutesFromMs(EMAIL_VERIFICATION_TOKEN_TTL_MS),
        })
        const deliveryId = yield* createTrackedEmailDelivery({
            purpose: "auth_email_change",
            template_id: authEmailVerificationTemplate.id,
            contact_id: auth.contact_id,
            to: input.new_email,
            subject: email.subject,
            auth_route: "email-change-request",
            request_id: requestId(request),
        })
        const deliveryOutcome = yield* resolveEmailDeliveryOutcome(
            emailTransport.send(email)
        )

        yield* markTrackedEmailDeliveryOutcome(deliveryId, deliveryOutcome)

        yield* recordAuthEmailDelivery(
            request,
            "email-change-request",
            "auth.email_change.email_delivery",
            contact,
            emailHash,
            deliveryOutcome
        )
        yield* recordAuthAuditEvent({
            action: "auth.email_change.requested",
            entity_type: "contact",
            entity_id: auth.contact_id,
            actor_contact_id: auth.contact_id,
            contact_id: auth.contact_id,
            session_id: auth.id,
            request_id: requestId(request),
            metadata: {
                ...authAuditMetadata(request, "email-change-request"),
                email_hash: emailHash,
            },
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.email_change.requested",
            source: "email-change-request",
            contact_id: auth.contact_id,
            session_id: auth.id,
            request_id: requestId(request),
            metadata: {
                email_hash: emailHash,
                delivery_outcome: deliveryOutcome,
            },
        }).pipe(Effect.catch(() => Effect.void))

        return genericEmailVerificationRequestResponse()
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "email-change-request")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "email-change-request")
        ),
        Effect.withLogSpan("auth.email_change.request"),
        Effect.withSpan("auth.email_change.request"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse({ error: "Invalid request" }, { status: 400 })
            )
        )
    )

const handleEmailChangeConfirm = (request: Request): AuthHandlerEffect =>
    Effect.gen(function* () {
        const input = yield* Schema.decodeUnknownEffect(
            EmailChangeConfirmInput
        )(yield* readJson(request))
        const tokenHash = hashedAuditValue(input.token)
        const rateLimitResponse = yield* checkAuthRouteRateLimit(
            request,
            "email-change-confirm",
            [tokenHash]
        )

        if (rateLimitResponse !== undefined) {
            return rateLimitResponse
        }

        const consumed = yield* consumeEmailChangeToken(input.token)

        if (consumed === undefined) {
            yield* recordAuthAuditEvent({
                action: "auth.email_change.completed",
                entity_type: "contact",
                request_id: requestId(request),
                result: "failed",
                reason_class: "validation_failed",
                metadata: authAuditMetadata(request, "email-change-confirm"),
            })
            yield* recordObservabilityLog({
                level: "warning",
                message: "auth.email_change.completed",
                source: "email-change-confirm",
                request_id: requestId(request),
                metadata: {
                    result: "failed",
                    reason_class: "validation_failed",
                },
            }).pipe(Effect.catch(() => Effect.void))
            return jsonResponse(
                { error: "Invalid verification token" },
                { status: 400 }
            )
        }

        yield* Effect.annotateLogs({ contact_id: consumed.contact_id })(
            Effect.void
        )
        yield* Effect.annotateSpans({ contact_id: consumed.contact_id })(
            Effect.void
        )
        yield* recordAuthAuditEvent({
            action: "auth.email_change.completed",
            entity_type: "contact",
            entity_id: consumed.contact_id,
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            result: "succeeded",
            metadata: authAuditMetadata(request, "email-change-confirm"),
        })
        yield* recordObservabilityLog({
            level: "info",
            message: "auth.email_change.completed",
            source: "email-change-confirm",
            contact_id: consumed.contact_id,
            request_id: requestId(request),
            metadata: { result: "succeeded" },
        }).pipe(Effect.catch(() => Effect.void))

        return jsonResponse({ ok: true }, { status: 200 })
    }).pipe(
        Effect.annotateLogs(
            authTelemetryContext(request, "email-change-confirm")
        ),
        Effect.annotateSpans(
            authTelemetryContext(request, "email-change-confirm")
        ),
        Effect.withLogSpan("auth.email_change.confirm"),
        Effect.withSpan("auth.email_change.confirm"),
        Effect.catch(() =>
            Effect.succeed(
                jsonResponse({ error: "Invalid request" }, { status: 400 })
            )
        )
    )

// The 404 here is a fall-through, not an assertion that the path is unrouted:
// handleGoogleAuthRequest owns three other /auth/ paths and must be tried first.
export const handleFallbackAuthRequest = (
    request: Request
): AuthHandlerEffect => {
    const url = new URL(request.url)

    if (request.method === "POST" && url.pathname === "/auth/login") {
        return handleLogin(request)
    }

    if (request.method === "POST" && url.pathname === "/auth/sign-up") {
        return handleSignUp(request)
    }

    if (request.method === "GET" && url.pathname === "/auth/me") {
        return handleMe(request)
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
        return handleLogout(request)
    }

    if (request.method === "POST" && url.pathname === "/auth/domain/handoff") {
        return handleDomainHandoff(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/email-verification/request"
    ) {
        return handleEmailVerificationRequest(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/email-verification/confirm"
    ) {
        return handleEmailVerificationConfirm(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/password-reset/request"
    ) {
        return handlePasswordResetRequest(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/password-reset/confirm"
    ) {
        return handlePasswordResetConfirm(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/sessions/revoke-others"
    ) {
        return handleRevokeOtherSessions(request)
    }

    if (request.method === "POST" && url.pathname === "/auth/password/change") {
        return handlePasswordChange(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/email/change/request"
    ) {
        return handleEmailChangeRequest(request)
    }

    if (
        request.method === "POST" &&
        url.pathname === "/auth/email/change/confirm"
    ) {
        return handleEmailChangeConfirm(request)
    }

    return Effect.succeed(jsonResponse({ error: "Not found" }, { status: 404 }))
}
