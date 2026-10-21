import { Schema } from "effect"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import {
    EmailDeliveryPurpose,
    EmailDeliveryStatus,
    EmailSendStatus,
    EmailSubscriptionStatus,
} from "@urm/domain/schemas/email"

export const Contact = Schema.Struct({
    _id: Schema.String,
    name: Schema.String,
    tel: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    company: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})
export type Contact = typeof Contact.Type

export const ContactEmailAddress = Schema.Struct({
    _id: Schema.String,
    contact_id: Schema.String,
    email: Schema.String,
    is_primary: Schema.Boolean,
})
export type ContactEmailAddress = typeof ContactEmailAddress.Type

export const Member = Schema.Struct({
    _id: Schema.String,
    first: Schema.String,
    last: Schema.String,
    twitter: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})
export type Member = typeof Member.Type

export const EmailSubscriptionBundle = Schema.Struct({
    subscription: Schema.Struct({
        list_key: Schema.String,
        status: EmailSubscriptionStatus,
        source: Schema.optional(Schema.String),
        subscribed_at: Schema.optional(Schema.Number),
        unsubscribed_at: Schema.optional(Schema.Number),
    }),
    contact: Contact,
    email_addresses: Schema.Array(ContactEmailAddress),
})
export type EmailSubscriptionBundle = typeof EmailSubscriptionBundle.Type

export const EmailNewsletterDraft = Schema.Struct({
    _id: Schema.String,
    name: Schema.String,
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.optional(Schema.String),
    cta_label: Schema.optional(Schema.String),
    list_key: Schema.String,
    template_source: Schema.optional(ContentTemplateSource),
    updated_at: Schema.Number,
})
export type EmailNewsletterDraft = typeof EmailNewsletterDraft.Type

export const EmailNewsletterSend = Schema.Struct({
    _id: Schema.String,
    audience: Schema.optional(Schema.Literals(["test", "subscribers"])),
    status: EmailSendStatus,
    approved_contact_count: Schema.Number,
    accepted_count: Schema.Number,
    queued_count: Schema.Number,
    sent_count: Schema.Number,
    failed_count: Schema.Number,
    skipped_count: Schema.Number,
    authoring_template_source: Schema.optional(ContentTemplateSource),
    delivery_template_source: Schema.optional(ContentTemplateSource),
    created_at: Schema.Number,
    completed_at: Schema.optional(Schema.Number),
})
export type EmailNewsletterSend = typeof EmailNewsletterSend.Type

export const EmailDelivery = Schema.Struct({
    _id: Schema.String,
    contact_id: Schema.optional(Schema.String),
    subject: Schema.String,
    is_test: Schema.optional(Schema.Boolean),
    status: EmailDeliveryStatus,
    provider_status: Schema.optional(Schema.String),
    to_domain: Schema.optional(Schema.String),
    error_message: Schema.optional(Schema.String),
    purpose: EmailDeliveryPurpose,
    created_at: Schema.Number,
    sent_at: Schema.optional(Schema.Number),
})
export type EmailDelivery = typeof EmailDelivery.Type
