/**
 * # Inbound Email Processing
 *
 * Future: Handle inbound email via Cloudflare Email Workers or webhooks.
 *
 * ## Scope
 *
 * - Parse inbound messages safely (MIME, headers, bodies, attachments)
 * - Store minimal metadata (from, to, subject, timestamp)
 * - Reject or drop unexpected recipients
 * - Support address aliases (`support@`, `noreply@`, tenant/domain-specific)
 * - Spam/abuse classification controls
 *
 * ## Design Notes
 *
 * - Intended for Cloudflare Email Workers binding or HTTP webhook endpoint
 * - Payload parsing should be defensive (malformed MIME, large payloads)
 * - Stored in a dedicated `inbound_emails` table, not in `email_deliveries`
 * - Spam score / abuse pattern matching before storage
 */
export const inboundEmailPlaceholder = "@urm/email/inbound — stub module"
