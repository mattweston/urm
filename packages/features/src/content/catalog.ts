/** # Content contracts */
import { Schema as S } from "effect"
import {
    ContentKind as ContentKindSchema,
    TemplateCapability as TemplateCapabilitySchema,
    TemplateProvenance as TemplateProvenanceSchema,
} from "@urm/domain/schemas/content-templates"
import { productionEmailTemplatePreviews } from "@urm/email/templates"
import { transactionalHref } from "../mail/platform/route.ts"
import { email_gallery_catalog } from "../mail/templates/gallery-catalog.ts"
import { newsletter_authoring_templates } from "../mail/newsletter/newsletter-authoring-templates.ts"

export const ContentKind = ContentKindSchema
export type ContentKind = typeof ContentKind.Type
export const TemplateCapability = TemplateCapabilitySchema
export type TemplateCapability = typeof TemplateCapability.Type
export const TemplateProvenance = TemplateProvenanceSchema
export type TemplateProvenance = typeof TemplateProvenance.Type

/**
 * Shared discovery metadata for target-specific templates. Authoring starters,
 * delivery layouts and transactional previews have different capabilities; sharing
 * a catalog does not make their schemas or authorized operations interchangeable.
 * Provenance and version identify the source copied into a draft.
 */
export const ContentTemplate = S.Struct({
    template_id: S.String,
    template_version: S.Number,
    content_kind: ContentKind,
    name: S.String,
    description: S.String,
    category: S.String,
    tags: S.Array(S.String),
    provenance: TemplateProvenance,
    capability: TemplateCapability,
    creation_href: S.NullOr(S.String),
    preview_href: S.NullOr(S.String),
    deprecation: S.optionalKey(
        S.Struct({
            reason: S.NonEmptyString,
            replacement_template_id: S.NullOr(S.NonEmptyString),
        })
    ),
})
export type ContentTemplate = typeof ContentTemplate.Type

export const template_replacement = (
    template: ContentTemplate,
    templates: ReadonlyArray<ContentTemplate>
): ContentTemplate | undefined => {
    if (
        template.provenance !== "builtin" ||
        template.capability !== "authoring"
    )
        return undefined
    const replacement_id = template.deprecation?.replacement_template_id
    if (replacement_id == null || replacement_id === template.template_id)
        return undefined
    return templates.find(
        (candidate) =>
            candidate.template_id === replacement_id &&
            candidate.content_kind === template.content_kind &&
            candidate.provenance === "builtin" &&
            candidate.capability === "authoring" &&
            candidate.deprecation === undefined &&
            candidate.creation_href !== null
    )
}

export type OrganizationTemplateSummary<TemplateId extends string> = Readonly<{
    template_id: TemplateId
    name: string
    description: string
    category: string
    tags: ReadonlyArray<string>
    content_kind: ContentKind
    provenance: TemplateProvenance
    capability: TemplateCapability
    block_count: number
    revision: number
}>

const web_templates: ReadonlyArray<ContentTemplate> = [
    {
        template_id: "web.page_blank",
        template_version: 1,
        content_kind: "web",
        name: "Blank webpage",
        description: "Start a standard rich-text webpage with no content.",
        category: "Web",
        tags: ["page", "rich text"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/web/pages/new?kind=document",
        preview_href: null,
    },
    {
        template_id: "web.landing_blank",
        template_version: 1,
        content_kind: "web",
        name: "Blank landing page",
        description: "Start an empty block-based landing page.",
        category: "Web",
        tags: ["landing page"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/web/pages/new?kind=landing_blank",
        preview_href: null,
    },
    {
        template_id: "web.marketing_starter",
        template_version: 1,
        content_kind: "web",
        name: "Marketing starter",
        description:
            "Start with Hero, features, FAQ, and call-to-action blocks.",
        category: "Web",
        tags: ["landing page", "marketing"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/web/pages/new?kind=marketing_starter",
        preview_href: null,
    },
    {
        template_id: "web.urm_marketing",
        template_version: 1,
        content_kind: "web",
        name: "URM marketing",
        description: "Start with the complete URM marketing-page example.",
        category: "Web",
        tags: ["landing page", "marketing", "urm"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/web/pages/new?kind=urm_marketing",
        preview_href: null,
    },
]

const email_templates: ReadonlyArray<ContentTemplate> =
    productionEmailTemplatePreviews.map(
        (template): ContentTemplate => ({
            template_id: `email.${template.id}`,
            template_version: 1,
            content_kind: "email",
            name: template.name,
            description:
                template.id === "newsletter_basic"
                    ? "The production delivery layout for newsletter drafts."
                    : "A typed transactional system email with trusted runtime values.",
            category: template.category,
            tags: [template.category.toLocaleLowerCase(), "email"],
            provenance: "system",
            capability:
                template.id === "newsletter_basic"
                    ? "delivery"
                    : "transactional",
            creation_href: null,
            preview_href:
                template.id === "newsletter_basic"
                    ? `/content/templates?kind=email&preview=${encodeURIComponent(`production-${template.id}`)}`
                    : transactionalHref(template.id),
        })
    )

const email_authoring_templates: ReadonlyArray<ContentTemplate> = [
    {
        template_id: "email.newsletter_blank",
        template_version: 1,
        content_kind: "email",
        name: "Blank newsletter",
        description:
            "Create newsletter copy for the production email delivery layout.",
        category: "Marketing",
        tags: ["newsletter", "email"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/content/email/new",
        preview_href: null,
    },
    ...newsletter_authoring_templates.map(
        (template): ContentTemplate => ({
            template_id: template.template_id,
            template_version: 1,
            content_kind: "email",
            name: template.name,
            description: template.description,
            category: "Marketing",
            tags: template.tags,
            provenance: "builtin",
            capability: "authoring",
            creation_href: `/content/email/new?template=${encodeURIComponent(template.template_id)}`,
            preview_href: `/content/templates?kind=email&preview=${encodeURIComponent(template.preview_id)}`,
        })
    ),
]

const email_gallery_templates: ReadonlyArray<ContentTemplate> =
    email_gallery_catalog
        .filter(
            (gallery_template) =>
                !newsletter_authoring_templates.some(
                    (authoring_template) =>
                        authoring_template.preview_id === gallery_template.id
                )
        )
        .map((template) => ({
            template_id: `email.preview.${template.id}`,
            template_version: 1,
            content_kind: "email",
            name: template.name,
            description:
                template.kind === "block"
                    ? `A hardcoded ${template.source_category.toLocaleLowerCase()} email block example. It is not yet a serializable authoring template.`
                    : `A hardcoded ${template.source_category.toLocaleLowerCase()} email example. It is not yet a serializable authoring template.`,
            category: template.category,
            tags: [
                "email",
                "preview",
                template.kind,
                template.source_category.toLocaleLowerCase(),
            ],
            provenance: "sample",
            capability: "preview_only",
            creation_href: null,
            preview_href: `/content/templates?kind=email&preview=${encodeURIComponent(template.id)}`,
        }))

const other_templates: ReadonlyArray<ContentTemplate> = [
    {
        template_id: "blog.blank",
        template_version: 1,
        content_kind: "blog",
        name: "Blank blog post",
        description: "Start a new rich-text blog draft.",
        category: "Blog",
        tags: ["blog", "rich text"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/content/blog/new",
        preview_href: null,
    },
    {
        template_id: "form.blank",
        template_version: 1,
        content_kind: "form",
        name: "Blank form",
        description: "Open Forms and create an empty field definition.",
        category: "Forms",
        tags: ["form", "fields"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/content/form/new",
        preview_href: null,
    },
    {
        template_id: "social.blank",
        template_version: 1,
        content_kind: "social",
        name: "Blank social post",
        description: "Open a new provider-backed social draft.",
        category: "Social",
        tags: ["social", "post"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/content/social/new",
        preview_href: null,
    },
    {
        template_id: "document.blank",
        template_version: 1,
        content_kind: "document",
        name: "Blank internal document",
        description: "Start a private organization-wide rich-text document.",
        category: "Documents",
        tags: ["document", "rich text"],
        provenance: "builtin",
        capability: "authoring",
        creation_href: "/content/documents/new",
        preview_href: null,
    },
]

export const content_templates: ReadonlyArray<ContentTemplate> = [
    ...web_templates,
    ...email_authoring_templates,
    ...email_templates,
    ...email_gallery_templates,
    ...other_templates,
]

export const authoring_templates: ReadonlyArray<ContentTemplate> =
    content_templates.filter((template) => template.capability === "authoring")
