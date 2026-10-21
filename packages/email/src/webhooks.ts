/**
 * # Email Webhooks (Bounce, Complaint, Open, Click)
 *
 * Future: Handle providers that send HTTP webhooks and engagement tracking.
 * Cloudflare Email Sending lifecycle events use the authenticated Queues pull
 * worker in cloudflare-events.ts and the PostgreSQL event ledger instead.
 *
 * ## Scope
 *
 * - Normalize additional providers' bounce and complaint notifications
 * - Open tracking: embed transparent tracking pixel, log opens per delivery
 * - Click tracking: rewrite links through tracking redirect, log clicks
 *
 * ## Design Notes
 *
 * - Each provider (Cloudflare, future SMTP fallback) has different webhook
 *   payload shapes; normalise into a common `WebhookEvent` tagged union
 * - Additional providers should reuse the same suppression policy
 * - Open/click data lives in a separate `email_engagement` table linked to
 *   `email_deliveries.id`
 * - Webhook endpoints are unauthenticated but verify provider signatures
 *   (or a shared secret) before processing
 * - Rate-limit webhook ingestion independently of auth endpoints
 */
export const emailWebhooksPlaceholder = "@urm/email/webhooks — stub module"
