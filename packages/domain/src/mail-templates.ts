import { Schema } from "effect"

export const NewsletterTemplate = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.NullOr(Schema.String),
    cta_label: Schema.NullOr(Schema.String),
    revision: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type NewsletterTemplate = typeof NewsletterTemplate.Type

export const NewsletterTemplateCatalogRecord = Schema.Struct({
    id: Schema.String,
    templates: Schema.Array(NewsletterTemplate),
})
export type NewsletterTemplateCatalogRecord =
    typeof NewsletterTemplateCatalogRecord.Type

const trimmed = (max: number) =>
    Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(max))

export const SaveNewsletterTemplateInput = Schema.Struct({
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
    // 0 creates; any other value must match the stored revision.
    expected_revision: Schema.Number,
    name: trimmed(200),
    description: Schema.String.check(Schema.isMaxLength(2000)),
    tags: Schema.Array(trimmed(60)).check(Schema.isMaxLength(20)),
    subject: trimmed(500),
    headline: trimmed(500),
    body_text: trimmed(20000),
    cta_url: Schema.NullOr(Schema.String.check(Schema.isMaxLength(2048))),
    cta_label: Schema.NullOr(Schema.String.check(Schema.isMaxLength(200))),
})
export type SaveNewsletterTemplateInput =
    typeof SaveNewsletterTemplateInput.Type

export class NewsletterTemplateWriteError extends Schema.TaggedErrorClass<NewsletterTemplateWriteError>()(
    "NewsletterTemplateWriteError",
    { message: Schema.String }
) {}

export const NEWSLETTER_TEMPLATE_LIMIT = 100

export const newsletter_template_catalog_id = (domain_id: string): string =>
    `${domain_id}/newsletter-templates`
