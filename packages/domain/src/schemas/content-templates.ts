import * as Schema from "effect/Schema"

export const ContentKind = Schema.Literals([
    "web",
    "blog",
    "email",
    "social",
    "form",
    "document",
])
export type ContentKind = typeof ContentKind.Type

export const ContentTemplateCategory = Schema.Literals([
    "Web",
    "Blog",
    "Forms",
    "Social",
    "Documents",
    "Auth",
    "Marketing",
])
export type ContentTemplateCategory = typeof ContentTemplateCategory.Type

export const ContentTemplateName = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(160)
)
export type ContentTemplateName = typeof ContentTemplateName.Type
export const ContentTemplateDescription = Schema.Trimmed.check(
    Schema.isMaxLength(500)
)
export type ContentTemplateDescription = typeof ContentTemplateDescription.Type
export const ContentTemplateTag = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(40)
)
export type ContentTemplateTag = typeof ContentTemplateTag.Type
export const ContentTemplateTags = Schema.Array(ContentTemplateTag).check(
    Schema.isMaxLength(12)
)
export type ContentTemplateTags = typeof ContentTemplateTags.Type

export const TemplateProvenance = Schema.Literals([
    "builtin",
    "organization",
    "system",
    "sample",
])
export type TemplateProvenance = typeof TemplateProvenance.Type

export const TemplateCapability = Schema.Literals([
    "authoring",
    "delivery",
    "transactional",
    "preview_only",
])
export type TemplateCapability = typeof TemplateCapability.Type

export const ContentTemplateSource = Schema.Struct({
    template_id: Schema.String,
    template_version: Schema.Number,
    provenance: TemplateProvenance,
})
export type ContentTemplateSource = typeof ContentTemplateSource.Type
