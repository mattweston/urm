/**
 * # Email
 *
 * Outbound email: the EmailTransport service (Cloudflare REST/SMTP layers),
 * attachment validation, templates, and provider transports. PostgreSQL owns
 * the migrated delivery ledger.
 */
export {
    EmailAttachmentValidationError,
    validateEmailAttachments,
    MAX_ATTACHMENT_TOTAL_BYTES,
} from "./attachments.ts"
export { CloudflareEmailError, sendCloudflareEmail } from "./cloudflare.ts"
export { CloudflareSmtpError, sendCloudflareSmtpEmail } from "./smtp.ts"
export {
    CloudflareRestEmailTransportLive,
    CloudflareSmtpEmailTransportLive,
    DemoEmailTransportLive,
    EmailTransport,
} from "./transport.ts"
export {
    authEmailVerificationTemplate,
    authPasswordChangedTemplate,
    authPasswordResetTemplate,
    authVerificationEmail,
    defaultEmailTemplateTheme,
    emailVerificationUrl,
    newsletterBasicEmail,
    newsletterBasicTemplate,
    passwordChangedEmail,
    passwordResetEmail,
    passwordResetUrl,
    productionEmailTemplatePreviews,
    transactionalEmailTemplatePreviews,
    transactionalTemplateTestEmail,
    unsubscribeUrl,
} from "./templates.ts"
export {
    decodeEmailNewsletterBlockContent,
    decodeEmailNewsletterContent,
    EmailNewsletterBlock,
    EmailNewsletterArticleCardBlock,
    EmailNewsletterCallToActionBlock,
    EmailNewsletterDocument,
    EmailNewsletterExternalImage,
    EmailNewsletterGalleryBlock,
    EmailNewsletterHeroBlock,
    EmailNewsletterRichTextBlock,
    EmailNewsletterTestimonialBlock,
    emailNewsletterBlocksPlainText,
    emailNewsletterDocumentFromRichText,
    emailNewsletterDocumentFromPlainText,
    emailNewsletterPlainText,
    emailNewsletterPrimaryRichText,
    encodeEmailNewsletterBlockContent,
    encodeEmailNewsletterContent,
    replaceEmailNewsletterPrimaryRichText,
} from "./newsletter-content.ts"
export type {
    AuthVerificationEmailInput,
    EmailTemplateTheme,
    EmailTemplateCategory,
    EmailTemplateDefinition,
    EmailTemplateId,
    EmailTemplatePreview,
    TransactionalEmailTemplateId,
    NewsletterBasicEmailInput,
    PasswordChangedEmailInput,
    PasswordResetEmailInput,
} from "./templates.ts"
export type {
    EmailAddress,
    EmailAttachment,
    EmailAttachmentDisposition,
    EmailFetch,
    EmailRecipients,
    EmailSendInput,
    EmailSendResult,
    EmailSendSkippedReason,
} from "./types.ts"
