import { Option, Schema as S } from "effect"
import {
    EmailNewsletterDocument,
    encodeEmailNewsletterBlockContent,
    encodeEmailNewsletterContent,
} from "@urm/email/newsletter-content"
import type {
    RichTextDocument,
    RichTextHeadingNode,
    RichTextParagraphNode,
    RichTextTextNode,
} from "@urm/domain/schemas/rich-text"

import { NewsletterDraft } from "./newsletter.model.ts"

export const NewsletterAuthoringTemplateId = S.Literals([
    "email.sample.welcome",
    "email.sample.weekly_digest",
    "email.sample.review_request",
    "email.sample.policy_update",
    "email.block.hero",
    "email.block.newsletter_cta",
    "email.block.testimonial_centered",
    "email.block.article_card",
    "email.block.single_image",
    "email.block.image_grid",
])
export type NewsletterAuthoringTemplateId =
    typeof NewsletterAuthoringTemplateId.Type

export type NewsletterAuthoringTemplate = Readonly<{
    template_id: NewsletterAuthoringTemplateId
    preview_id: string
    name: string
    description: string
    tags: ReadonlyArray<string>
    create: () => NewsletterDraft
}>

const text = (value: string): RichTextTextNode => ({
    type: "text",
    text: value,
})

const paragraph = (value: string): RichTextParagraphNode => ({
    type: "paragraph",
    children: [text(value)],
})

const heading = (value: string): RichTextHeadingNode => ({
    type: "heading",
    level: 2,
    children: [text(value)],
})

const document = (
    children: RichTextDocument["children"]
): RichTextDocument => ({
    type: "doc",
    children,
})

const draft = (
    name: string,
    subject: string,
    headline: string,
    children: RichTextDocument["children"]
): NewsletterDraft =>
    S.decodeUnknownSync(NewsletterDraft)({
        name,
        subject,
        headline,
        body_text: encodeEmailNewsletterContent(document(children)),
        cta_url: "",
        cta_label: "",
        list_key: "newsletter",
    })

const block_draft = (
    name: string,
    subject: string,
    headline: string,
    block_document: EmailNewsletterDocument
): NewsletterDraft =>
    S.decodeUnknownSync(NewsletterDraft)({
        name,
        subject,
        headline,
        body_text: encodeEmailNewsletterBlockContent(block_document),
        cta_url: "",
        cta_label: "",
        list_key: "newsletter",
    })

export const newsletter_authoring_templates: ReadonlyArray<NewsletterAuthoringTemplate> =
    [
        {
            template_id: "email.sample.welcome",
            preview_id: "sample-welcome",
            name: "Welcome email",
            description:
                "Start an editable welcome newsletter with introductory copy.",
            tags: ["welcome", "onboarding", "newsletter"],
            create: () =>
                draft("Welcome email", "Welcome to our community", "Welcome", [
                    paragraph(
                        "Thanks for signing up. Your account is ready to use."
                    ),
                    paragraph(
                        "Introduce the most useful next step and explain where readers can get help."
                    ),
                    paragraph("— The team"),
                ]),
        },
        {
            template_id: "email.sample.weekly_digest",
            preview_id: "sample-weekly-digest",
            name: "Weekly digest",
            description:
                "Start an editable weekly roundup with structured summary sections.",
            tags: ["digest", "weekly", "newsletter"],
            create: () =>
                draft(
                    "Weekly digest",
                    "Your weekly digest",
                    "This week at a glance",
                    [
                        paragraph(
                            "Here is a summary of the most important activity from the past week."
                        ),
                        heading("Highlights"),
                        paragraph(
                            "Replace this text with the key updates, milestones, or stories your readers should know."
                        ),
                        heading("Coming next"),
                        paragraph(
                            "Tell readers what to expect and how they can take part."
                        ),
                    ]
                ),
        },
        {
            template_id: "email.sample.review_request",
            preview_id: "sample-review-request",
            name: "Review request",
            description:
                "Start an editable request for feedback after a customer interaction.",
            tags: ["review", "feedback", "engagement"],
            create: () =>
                draft(
                    "Review request",
                    "How did we do?",
                    "We would value your feedback",
                    [
                        paragraph(
                            "Thank your customer and briefly explain why their feedback matters."
                        ),
                        paragraph(
                            "Add a review or survey link using the editor after checking the destination."
                        ),
                    ]
                ),
        },
        {
            template_id: "email.sample.policy_update",
            preview_id: "sample-policy-update",
            name: "Policy update",
            description:
                "Start an editable announcement explaining a policy change.",
            tags: ["policy", "announcement", "update"],
            create: () =>
                draft(
                    "Policy update",
                    "An update to our policies",
                    "What is changing",
                    [
                        paragraph(
                            "Explain the policy change in clear language and state when it takes effect."
                        ),
                        heading("What you need to know"),
                        paragraph(
                            "Summarize the practical effect for readers and identify any action they need to take."
                        ),
                        paragraph(
                            "Add a link to the complete policy after verifying the destination."
                        ),
                    ]
                ),
        },
        {
            template_id: "email.block.hero",
            preview_id: "hero-section",
            name: "Hero section",
            description:
                "Start an editable email with a featured hero and rich-text body.",
            tags: ["hero", "marketing", "email block"],
            create: () =>
                block_draft(
                    "Hero email",
                    "A featured update",
                    "Latest from us",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "hero",
                                type: "hero",
                                eyebrow: "Featured update",
                                heading: "Put the main message first",
                                body: "Use this space to explain why the update matters to your readers.",
                            },
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Continue with supporting detail, useful links, and the next step."
                                    ),
                                ]),
                            },
                        ],
                    })
                ),
        },
        {
            template_id: "email.block.newsletter_cta",
            preview_id: "newsletter-cta",
            name: "Newsletter CTA",
            description:
                "Start an editable email with supporting copy and a call-to-action panel.",
            tags: ["cta", "marketing", "email block"],
            create: () =>
                block_draft(
                    "Newsletter CTA",
                    "Take the next step",
                    "A clear next step",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Give readers enough context to understand the offer before asking them to act."
                                    ),
                                ]),
                            },
                            {
                                block_id: "call-to-action",
                                type: "call_to_action",
                                heading: "Ready to learn more?",
                                body: "Explain what readers will find after following the link.",
                                label: "Learn more",
                                url: "https://example.com/",
                            },
                        ],
                    })
                ),
        },
        {
            template_id: "email.block.testimonial_centered",
            preview_id: "testimonial-centered",
            name: "Testimonial centered",
            description:
                "Start an editable email with a centered customer testimonial.",
            tags: ["testimonial", "social proof", "email block"],
            create: () =>
                block_draft(
                    "Customer story",
                    "What customers are saying",
                    "A customer perspective",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "testimonial",
                                type: "testimonial",
                                quote: "Replace this with a concise, approved customer quote.",
                                attribution: "Customer name, role",
                            },
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Add context about the customer outcome and invite readers to learn more."
                                    ),
                                ]),
                            },
                        ],
                    })
                ),
        },
        {
            template_id: "email.block.article_card",
            preview_id: "article-card",
            name: "Article card",
            description:
                "Start an editable article feature with an external HTTPS image.",
            tags: ["article", "content", "email block"],
            create: () =>
                block_draft(
                    "Article feature",
                    "A useful article for you",
                    "Featured reading",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "article-card",
                                type: "article_card",
                                image: {
                                    image_id: "article-image",
                                    source: "external_https",
                                    src: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=300&fit=crop",
                                    alt: "Open laptop beside a notebook",
                                },
                                kicker: "Technology • 5 min read",
                                heading:
                                    "10 tips for building better email templates",
                                summary:
                                    "Share a concise summary that helps readers decide whether to open the complete article.",
                                link_label: "Read more",
                                url: "https://example.com/article",
                            },
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Add supporting commentary or another useful link."
                                    ),
                                ]),
                            },
                        ],
                    })
                ),
        },
        {
            template_id: "email.block.single_image",
            preview_id: "single-image",
            name: "Single image",
            description:
                "Start an editable image feature using a durable external HTTPS source.",
            tags: ["image", "gallery", "email block"],
            create: () =>
                block_draft(
                    "Single image email",
                    "A visual update",
                    "A visual update",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "gallery",
                                type: "gallery",
                                images: [
                                    {
                                        image_id: "mountain",
                                        source: "external_https",
                                        src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
                                        alt: "Mountain landscape",
                                    },
                                ],
                            },
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Explain what the image shows and why it matters."
                                    ),
                                ]),
                            },
                        ],
                    })
                ),
        },
        {
            template_id: "email.block.image_grid",
            preview_id: "image-grid",
            name: "Image grid",
            description:
                "Start an editable two-column gallery with four external HTTPS images.",
            tags: ["images", "gallery", "email block"],
            create: () =>
                block_draft(
                    "Image grid email",
                    "Four moments to share",
                    "Highlights in pictures",
                    S.decodeUnknownSync(EmailNewsletterDocument)({
                        schema_version: 2,
                        blocks: [
                            {
                                block_id: "gallery",
                                type: "gallery",
                                images: [
                                    {
                                        image_id: "travel-1",
                                        source: "external_https",
                                        src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=200&fit=crop",
                                        alt: "Mountain lake",
                                    },
                                    {
                                        image_id: "travel-2",
                                        source: "external_https",
                                        src: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300&h=200&fit=crop",
                                        alt: "Traveller overlooking a valley",
                                    },
                                    {
                                        image_id: "travel-3",
                                        source: "external_https",
                                        src: "https://images.unsplash.com/photo-1476900543704-4312b78632f8?w=300&h=200&fit=crop",
                                        alt: "Coastal landscape",
                                    },
                                    {
                                        image_id: "travel-4",
                                        source: "external_https",
                                        src: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=300&h=200&fit=crop",
                                        alt: "Forest road",
                                    },
                                ],
                            },
                            {
                                block_id: "body",
                                type: "rich_text",
                                document: document([
                                    paragraph(
                                        "Add a caption or explain the story connecting these images."
                                    ),
                                ]),
                            },
                        ],
                    })
                ),
        },
    ]

export const newsletter_authoring_template = (
    template_id: NewsletterAuthoringTemplateId
): NewsletterAuthoringTemplate | null =>
    newsletter_authoring_templates.find(
        (template) => template.template_id === template_id
    ) ?? null

export const newsletter_authoring_template_for_search = (
    search: string
): NewsletterAuthoringTemplate | null => {
    const decoded = S.decodeUnknownOption(NewsletterAuthoringTemplateId)(
        new URLSearchParams(search).get("template")
    )
    return Option.match(decoded, {
        onNone: () => null,
        onSome: newsletter_authoring_template,
    })
}
