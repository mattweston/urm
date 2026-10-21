/**
 * # Newsletter / Bulk Campaign System
 *
 * Future: Scale newsletter sends beyond the 50-recipient small newsletter MVP.
 *
 * ## Scope
 *
 * - Larger recipient batches (hundreds to thousands) via throttled background
 *   worker instead of sequential in-request sends
 * - Mailing list management with segments/tags
 * - Scheduled sends
 * - Per-recipient personalisation (liquid/handlebars-style template vars)
 * - Suppression list integration (bounced, complained, unsubscribed)
 * - Campaign analytics (sent, delivered, opened, clicked, bounced, complained)
 * - A/B subject-line testing
 *
 * ## Design Notes
 *
 * - Backed by DB outbox + background worker (see EMAIL_TODO.md #7)
 * - Reuses `email_newsletter_sends`, `email_deliveries`, `email_subscriptions`
 *   schema; may add `email_campaign_segments`, `email_campaign_schedules`
 * - Cloudflare REST API limit of 50 recipients per call means larger sends
 *   fan out to multiple API calls per batch
 * - Consider dedicated bulk-email provider (SendGrid, AWS SES) if scale
 *   exceeds Cloudflare Email Service throughput
 */
export const emailCampaignsPlaceholder = "@urm/email/campaigns — stub module"
