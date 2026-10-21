import { Schema } from "effect"

export const PlatformNewsletterSubscriberStatus = Schema.Literals([
    "pending",
    "subscribed",
    "unsubscribed",
    "suppressed",
])

export type PlatformNewsletterSubscriberStatus = Schema.Schema.Type<
    typeof PlatformNewsletterSubscriberStatus
>

export const PlatformNewsletterSubscriber = Schema.Struct({
    subscriber_id: Schema.String,
    email: Schema.String,
    name: Schema.optional(Schema.String),
    list_key: Schema.String,
    status: PlatformNewsletterSubscriberStatus,
    confirmed_at: Schema.optional(Schema.Number),
    unsubscribed_at: Schema.optional(Schema.Number),
})

export type PlatformNewsletterSubscriber = Schema.Schema.Type<
    typeof PlatformNewsletterSubscriber
>

export const ListPlatformNewsletterSubscribersRequest = Schema.Struct({
    list_key: Schema.optional(Schema.String),
})

export type ListPlatformNewsletterSubscribersRequest = Schema.Schema.Type<
    typeof ListPlatformNewsletterSubscribersRequest
>

export const SetPlatformNewsletterSubscriberStatusRequest = Schema.Struct({
    subscriber_id: Schema.String,
    status: Schema.Literals(["subscribed", "unsubscribed", "suppressed"]),
})

export type SetPlatformNewsletterSubscriberStatusRequest = Schema.Schema.Type<
    typeof SetPlatformNewsletterSubscriberStatusRequest
>

export const SendPlatformNewsletterRequest = Schema.Struct({
    name: Schema.String,
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.optional(Schema.String),
    cta_label: Schema.optional(Schema.String),
    list_key: Schema.optional(Schema.String),
})

export type SendPlatformNewsletterRequest = Schema.Schema.Type<
    typeof SendPlatformNewsletterRequest
>

export const SendPlatformNewsletterResponse = Schema.Struct({
    newsletter_send_id: Schema.String,
    approved_subscriber_count: Schema.Number,
    sent_count: Schema.Number,
    failed_count: Schema.Number,
})

export type SendPlatformNewsletterResponse = Schema.Schema.Type<
    typeof SendPlatformNewsletterResponse
>
