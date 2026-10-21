import type { ContentTemplateCategory } from "@urm/domain/schemas/content-templates"

export type EmailGalleryCatalogEntry = Readonly<{
    id: string
    name: string
    category: ContentTemplateCategory
    source_category: string
    kind: "block" | "sample"
}>

const block = (
    id: string,
    name: string,
    source_category: string
): EmailGalleryCatalogEntry => ({
    id,
    name,
    category: "Marketing",
    source_category,
    kind: "block",
})

const sample = (
    id: string,
    name: string,
    source_category: string,
    category: ContentTemplateCategory = "Marketing"
): EmailGalleryCatalogEntry => ({
    id,
    name,
    category,
    source_category,
    kind: "sample",
})

export const email_gallery_catalog: ReadonlyArray<EmailGalleryCatalogEntry> = [
    block("article-card", "Article Card", "Articles"),
    block("article-list", "Article List", "Articles"),
    block("basic-avatar", "Basic Circular Avatar", "Avatars"),
    block("avatar-with-desc", "Avatar with Description", "Avatars"),
    block("product-price", "Product Price Card", "Ecommerce"),
    block("pricing-comparison", "Pricing Comparison", "Ecommerce"),
    block("star-rating", "Star Rating", "Feedback"),
    block("emoji-feedback", "Emoji Feedback", "Feedback"),
    block("single-image", "Single Image", "Gallery"),
    block("image-grid", "Image Grid", "Gallery"),
    block("hero-section", "Hero Section", "Marketing"),
    block("newsletter-cta", "Newsletter CTA", "Marketing"),
    block("satisfaction-survey", "Satisfaction Survey", "Surveys"),
    block("survey-section", "Survey Section", "Surveys"),
    block("testimonial-centered", "Testimonial Centered", "Testimonials"),
    block(
        "testimonial-large-avatar",
        "Testimonial with Large Avatar",
        "Testimonials"
    ),
    sample("sample-invoice", "Invoice", "Transactional"),
    sample("sample-welcome", "Welcome Email", "Onboarding"),
    sample("sample-reset-password", "Reset Password", "Security", "Auth"),
    sample("sample-confirm-email", "Confirm Email", "Security", "Auth"),
    sample("sample-verify-identity", "Verify Identity", "Security", "Auth"),
    sample("sample-otp-signin", "OTP Sign-in", "Security", "Auth"),
    sample("sample-domain-verified", "Domain Verified", "Platform"),
    sample("sample-new-device-login", "New Device Login", "Security", "Auth"),
    sample("sample-team-invite", "Team Invite", "Collaboration"),
    sample("sample-review-request", "Review Request", "Engagement"),
    sample("sample-weekly-digest", "Weekly Digest", "Engagement"),
    sample("sample-order-receipt", "Order Receipt", "Transactional"),
    sample("sample-shipping-receipt", "Shipping Receipt", "Transactional"),
    sample(
        "sample-shipping-notification",
        "Shipping Notification",
        "Transactional"
    ),
    sample("sample-payment-failed", "Payment Failed", "Transactional"),
    sample("sample-policy-update", "Policy Update", "Transactional"),
    sample("sample-account-deleted", "Account Deleted", "Transactional"),
    sample("sample-quota-warning", "Quota Warning", "Billing"),
    sample("sample-quota-exceeded", "Quota Exceeded", "Billing"),
]
