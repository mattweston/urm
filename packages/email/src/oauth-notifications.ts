/**
 * # OAuth / Account-Link Email Notifications
 *
 * Future: Send notification emails when a user links or unlinks an OAuth
 * provider to their account, or when an OAuth-based signup completes.
 *
 * ## Scope
 *
 * - "New OAuth account linked" notification
 * - "OAuth provider disconnected" notification
 * - Optional: "Someone signed in with <Provider>" notification
 *
 * ## Design Notes
 *
 * - Templates live here (email package); the decision to send lives in
 *   `@urm/auth` (auth package)
 * - Follows same `EmailTransport` interface as auth verification/reset flows
 * - Emits `email.delivery.sent/failed` audit events
 * - Best-effort delivery: transport failure does not block the auth response
 * - No token/security-sensitive content in the email body; purely
 *   informational with a "secure your account" link
 *
 * ## Related
 *
 * - Auth-handler trigger: `@urm/auth` when `auth_oauth_states` are consumed
 *   for linking flows
 * - Template registry: `@urm/email/templates`
 */
export const oauthEmailNotificationPlaceholder =
    "@urm/email/oauth-notifications — stub module"
