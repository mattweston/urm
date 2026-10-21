import * as Schema from "effect/Schema"

export const EmailProvider = Schema.Literals(["cloudflare", "bento"])

export const EmailDeliveryStatus = Schema.Literals([
    "pending",
    "accepted",
    "queued",
    "sent",
    "delivered",
    "bounced",
    "complained",
    "failed",
    "skipped",
])

export const EmailSendStatus = Schema.Literals([
    "draft",
    "queued",
    "sending",
    "completed",
    "failed",
])

export const EmailDeliveryPurpose = Schema.Literals([
    "newsletter",
    "transactional",
])

// Suppression records a provider-level safety decision and must not be
// reversible through the ordinary resubscribe flow.
export const EmailSubscriptionStatus = Schema.Literals([
    "subscribed",
    "unsubscribed",
    "suppressed",
])
export type EmailSubscriptionStatus = typeof EmailSubscriptionStatus.Type

export const EmailSubscription = Schema.Struct({
    contact_id: Schema.String,
    name: Schema.String,
    email: Schema.String,
    list_key: Schema.String,
    status: EmailSubscriptionStatus,
    source: Schema.optional(Schema.String),
    subscribed_at: Schema.optional(Schema.Number),
    unsubscribed_at: Schema.optional(Schema.Number),
})
export type EmailSubscription = typeof EmailSubscription.Type

export const SendSmallNewsletterRequest = Schema.Struct({
    request_id: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    name: Schema.String,
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.optional(Schema.String),
    cta_label: Schema.optional(Schema.String),
    list_key: Schema.optional(Schema.String),
})

export type SendSmallNewsletterRequest = Schema.Schema.Type<
    typeof SendSmallNewsletterRequest
>

export const SendSmallNewsletterResponse = Schema.Struct({
    newsletter_send_id: Schema.String,
    approved_contact_count: Schema.Number,
    queued_count: Schema.Number,
    sent_count: Schema.Number,
    failed_count: Schema.Number,
    skipped_count: Schema.Number,
})

export type SendSmallNewsletterResponse = Schema.Schema.Type<
    typeof SendSmallNewsletterResponse
>

export const ListEmailSubscriptionsRequest = Schema.Struct({
    list_key: Schema.optional(Schema.String),
})

export type ListEmailSubscriptionsRequest = Schema.Schema.Type<
    typeof ListEmailSubscriptionsRequest
>

export const ListEmailSubscriptionsResponse = Schema.Array(EmailSubscription)

export type ListEmailSubscriptionsResponse = Schema.Schema.Type<
    typeof ListEmailSubscriptionsResponse
>

export const SetEmailSubscriptionRequest = Schema.Struct({
    contact_id: Schema.String,
    list_key: Schema.String,
    status: EmailSubscriptionStatus,
})

export type SetEmailSubscriptionRequest = Schema.Schema.Type<
    typeof SetEmailSubscriptionRequest
>

export {
    AuthorizationError,
    DatabaseError,
    ValidationError,
} from "../errors.ts"
