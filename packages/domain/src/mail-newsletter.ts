/** # Newsletter authoring contracts
 * Write inputs enforce recipient intent and safe links while stored drafts
 * remain readable for correction.
 */
import { Schema } from "effect"
import { PublishedSiteTheme } from "./schemas/site-appearance.ts"

export const PublicationEmailThemeRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    brand_name: Schema.String,
    site_theme: PublishedSiteTheme,
})
export type PublicationEmailThemeRecord =
    typeof PublicationEmailThemeRecord.Type

export const TemplateSource = Schema.Struct({
    template_id: Schema.String,
    template_version: Schema.Number,
    provenance: Schema.Literals([
        "builtin",
        "organization",
        "system",
        "sample",
    ]),
})
export type TemplateSource = typeof TemplateSource.Type

export const NewsletterDraft = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.NullOr(Schema.String),
    cta_label: Schema.NullOr(Schema.String),
    list_key: Schema.String,
    template_source: Schema.NullOr(TemplateSource),
    updated_at: Schema.Number,
})
export type NewsletterDraft = typeof NewsletterDraft.Type

export const NewsletterSend = Schema.Struct({
    id: Schema.String,
    audience: Schema.Literals(["test", "subscribers"]),
    status: Schema.Literals([
        "draft",
        "queued",
        "sending",
        "completed",
        "failed",
    ]),
    approved_contact_count: Schema.Number,
    accepted_count: Schema.Number,
    queued_count: Schema.Number,
    sent_count: Schema.Number,
    failed_count: Schema.Number,
    skipped_count: Schema.Number,
    authoring_template_source: Schema.NullOr(TemplateSource),
    delivery_template_source: Schema.NullOr(TemplateSource),
    created_at: Schema.Number,
    completed_at: Schema.NullOr(Schema.Number),
})
export type NewsletterSend = typeof NewsletterSend.Type

export const NewsletterRecipient = Schema.Struct({
    contact_id: Schema.String,
    name: Schema.String,
    email: Schema.String,
})
export type NewsletterRecipient = typeof NewsletterRecipient.Type

export const NewsletterCatalogRecord = Schema.Struct({
    id: Schema.String,
    list_key: Schema.String,
    drafts: Schema.Array(NewsletterDraft),
    sends: Schema.Array(NewsletterSend),
    recipients: Schema.Array(NewsletterRecipient),
})
export type NewsletterCatalogRecord = typeof NewsletterCatalogRecord.Type

const bounded = (max: number) =>
    Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(max))

/**
 * Restricts new newsletter links to HTTP, HTTPS, email and telephone navigation.
 * Escaping HTML alone does not neutralize executable URL schemes. Stored drafts
 * remain readable, so email rendering must also validate links from older rows.
 */
export const NewsletterLink = Schema.String.check(
    Schema.isMaxLength(2048),
    Schema.makeFilter((value) => {
        if (value.trim() === "") return undefined
        const url = URL.parse(value)
        return url !== null &&
            ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
            ? undefined
            : "Use an HTTP, HTTPS, email or telephone link"
    })
)

export const SaveNewsletterDraftInput = Schema.Struct({
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
    name: bounded(255),
    subject: bounded(500),
    headline: bounded(500),
    body_text: Schema.String.check(Schema.isMaxLength(100_000)),
    cta_url: Schema.NullOr(NewsletterLink),
    cta_label: Schema.NullOr(Schema.String.check(Schema.isMaxLength(255))),
    list_key: bounded(255),
    template_source: Schema.NullOr(TemplateSource),
    // Rejects a save built on a stale draft, as the retained editor did.
    expected_updated_at: Schema.Number,
})
export type SaveNewsletterDraftInput = typeof SaveNewsletterDraftInput.Type

export const SendNewsletterInput = Schema.Struct({
    draft_id: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(128)
    ),
    // One request id per send; a repeat returns the existing send untouched.
    request_id: bounded(255),
    audience: Schema.Literals(["test", "subscribers"]),
    test_email: Schema.NullOr(Schema.String.check(Schema.isMaxLength(320))),
    test_name: Schema.NullOr(Schema.String.check(Schema.isMaxLength(255))),
}).check(
    Schema.makeFilter((input) =>
        input.audience !== "test" ||
        (input.test_email !== null &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.test_email.trim()))
            ? undefined
            : "Test sends require a valid test email"
    )
)
export type SendNewsletterInput = typeof SendNewsletterInput.Type

export class NewsletterWriteError extends Schema.TaggedError<NewsletterWriteError>()(
    "NewsletterWriteError",
    { message: Schema.String }
) {}

export const NEWSLETTER_DRAFT_LIMIT = 100
export const NEWSLETTER_SEND_LIMIT = 50
export const NEWSLETTER_RECIPIENT_LIMIT = 200

export const newsletter_catalog_id = (
    domain_id: string,
    list_key: string
): string => `${domain_id}/newsletter/${list_key}`
