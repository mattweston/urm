/**
 * # Auth
 *
 * Server-side Auth package.
 *
 * - Backend authentication utilities, handlers, and configuration.
 * - Server-side auth logic for oauth, cookies, sessions, and permissions.
 *
 * Note: frontend components and hooks are in `@urm/ui/auth`;
 * shared types are in `@urm/contracts/auth-legacy`.
 */

// TODO https://github.com/mikearnaldi/accountability/tree/main/packages/core/src/authentication

export {
    handleGoogleAuthorize,
    handleGoogleCallback,
} from "./oauth/google-handlers.ts"

export type { GoogleOAuthClient } from "./oauth/oauth-google.ts"
export { makeGoogle } from "./oauth/oauth-google.ts"

export { signCookie } from "./cookies/sign-cookie.ts"
export { verifyCookie } from "./cookies/verify-cookie.ts"
export { verifyDomainCookie } from "./cookies/verify-domain-cookie.ts"
export { parseCookies } from "./cookies/parse-cookies.ts"

export {
    handleLoginUrl,
    handleLogout,
    handleSession,
} from "./oauth/callback-handlers.ts"

export type { Contact } from "./contacts.ts"
export {
    getOrCreateContactFromDatabase,
    GetOrCreateContactError,
} from "./contacts.ts"

export {
    createContactAuthSession,
    createContactAuthSessionCookie,
    createContactAuthSessionFromHeaders,
    createContactAuthSessionCookieFromHeaders,
    getAuthSession,
    getAuthSessionContactId,
    rotateAuthSession,
    revokeContactAuthSessions,
    revokeOtherContactAuthSessions,
    revokeAuthSessionWithInfo,
    upsertContactAuthAccount,
} from "./sessions.ts"

export {
    consumeDomainSessionHandoff,
    createDomainSession,
    createDomainSessionHandoff,
    getDomainSession,
    generatedDomainAdminOrigin,
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "./domain-sessions.ts"
export type {
    DomainSession,
    DomainSessionHandoff,
    DomainSessionScope,
} from "./domain-sessions.ts"

export {
    generatedHostSuffix,
    generatedHostSuffixes,
    generatedHostSuffixForCentralHostname,
} from "./generated-hosts.ts"

export { handleCentralDomainSelection } from "./domain-selection.ts"
export { handleTrustedDomainScopeResolution } from "./domain-resolution.ts"

export {
    DOMAIN_LOGIN_INTENT_TTL_MS,
    domainLoginIntentPayload,
    verifyDomainLoginIntent,
} from "./domain-login-intent.ts"
export type {
    DomainLoginDestination,
    DomainLoginIntent,
} from "./domain-login-intent.ts"

export { encodePkce, decodePkce, GOOGLE_OAUTH_COOKIE } from "./oauth/pkce.ts"

export {
    PKCE_COOKIE_OPTS,
    PKCE_COOKIE_CLEAR,
    AUTH_COOKIE_OPTS,
    AUTH_COOKIE_CLEAR,
    cookieHeader,
} from "./cookies/cookie-opts.ts"

export { getContactID } from "./cookies/get-contact.ts"

export {
    Role,
    ROLE_HIERARCHY,
    ROLE_DESCRIPTIONS,
    hasRoleOrHigher,
    getRolesWithPrivilege,
    getRoleLevel,
    requireRole,
    getCurrentRole,
    patterns,
    UnauthorizedError,
    ForbiddenError,
} from "./permissions/index.ts"
export type { PermissionMatrix } from "./permissions/index.ts"
export type { AuthContextType } from "./context.ts"

export { authErrorToResponse } from "./error-handlers.ts"
export type { ErrorResponse } from "./error-handlers.ts"

export { AuthPersistence, AuthPersistenceLive } from "./auth-persistence.ts"
export type {
    AuthOAuthState,
    AuthPersistenceShape,
    AuthRateLimitBucket,
    AuthToken,
    AuthTokenContext,
} from "./auth-persistence.ts"

export {
    AuthSessionPersistence,
    AuthSessionPersistenceLive,
} from "./auth-session-persistence.ts"
export type {
    AuthSessionPersistenceShape,
    ContactAuthSessionRevocation,
} from "./auth-session-persistence.ts"

export {
    PasswordCredentialPersistence,
    PasswordCredentialPersistenceLive,
} from "./password-credential-persistence.ts"
export type {
    PasswordCredentialPersistenceShape,
    PasswordCredentialReplacement,
} from "./password-credential-persistence.ts"

export {
    AuditEventPersistence,
    AuditEventPersistenceLive,
    recordAuditEvent,
    sanitizeAuditMetadata,
} from "./audit-events.ts"

export {
    ObservabilityLogPersistence,
    ObservabilityLogPersistenceLive,
    recordObservabilityLog,
} from "./observability-logs.ts"
export type {
    ObservabilityLogInput,
    ObservabilityLogLevel,
    ObservabilityLogPersistenceShape,
} from "./observability-logs.ts"
export type {
    AuditEventPersistenceShape,
    AuditEventInput,
    AuditEventMetadata,
    AuditEventReasonClass,
    AuditEventResult,
} from "./audit-events.ts"

export {
    authRateLimitKey,
    authRateLimitWindowStart,
    checkAuthRateLimit,
} from "./rate-limiter.ts"
export type {
    AuthRateLimitDecision,
    AuthRateLimitInput,
} from "./rate-limiter.ts"

export {
    createPasswordCredential,
    ensurePasswordCredential,
    findActivePasswordCredential,
    hashPassword,
    PASSWORD_HASH_ALGORITHM,
    replacePasswordCredential,
    verifyPasswordCredential,
    verifyPasswordHash,
} from "./password-credentials.ts"
export type { PasswordHash, ScryptParameters } from "./password-credentials.ts"

export {
    DEFAULT_PASSWORD_POLICY,
    validatePasswordPolicy,
} from "./password-policy.ts"
export type {
    PasswordPolicyFailure,
    PasswordPolicyFailureReason,
    PasswordPolicyOptions,
    PasswordPolicyResult,
    PasswordPolicySuccess,
} from "./password-policy.ts"

export { validatePasswordSafety } from "./password-safety.ts"
export type {
    PasswordSafetyFailure,
    PasswordSafetyFailureReason,
    PasswordSafetyOptions,
    PasswordSafetyResult,
    PasswordSafetySuccess,
} from "./password-safety.ts"

export {
    checkPwnedPassword,
    pwnedPasswordRange,
    sha1UpperHex,
} from "./pwned-passwords.ts"
export type {
    PwnedPasswordCheck,
    PwnedPasswordFetch,
} from "./pwned-passwords.ts"

export {
    consumeEmailVerificationToken,
    createEmailVerificationToken,
    EMAIL_VERIFICATION_PURPOSE,
    EMAIL_VERIFICATION_TOKEN_TTL_MS,
    hashEmailVerificationToken,
    newEmailVerificationToken,
} from "./email-verification.ts"
export type {
    ConsumedEmailVerificationToken,
    CreatedEmailVerificationToken,
    EmailVerificationTokenContext,
} from "./email-verification.ts"

export {
    consumePasswordResetToken,
    createPasswordResetToken,
    findActivePasswordResetToken,
    hashPasswordResetToken,
    newPasswordResetToken,
    PASSWORD_RESET_TOKEN_TTL_MS,
} from "./password-reset.ts"
export type {
    ActivePasswordResetToken,
    ConsumedPasswordResetToken,
    CreatedPasswordResetToken,
    PasswordResetTokenContext,
} from "./password-reset.ts"

export {
    consumeOAuthState,
    createOAuthState,
    hashOAuthStateValue,
    OAUTH_STATE_TTL_MS,
} from "./oauth-states.ts"
export type {
    ConsumedOAuthState,
    CreatedOAuthState,
    OAuthStateContext,
} from "./oauth-states.ts"
