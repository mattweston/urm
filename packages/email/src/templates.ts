/** # Safe email rendering */
import type { EmailSendInput } from "./types.ts"
import {
    default_transactional_copy,
    type TransactionalCopy,
} from "./transactional-content.ts"
import type {
    RichTextDocument,
    RichTextMark,
    RichTextTextNode,
} from "@urm/domain/schemas/rich-text"
import type {
    EmailNewsletterDocument,
    EmailNewsletterExternalImage,
} from "./newsletter-content.ts"
import { emailNewsletterBlocksPlainText } from "./newsletter-content.ts"

export type EmailTemplateId =
    | "auth_email_verification"
    | "auth_password_reset"
    | "auth_password_changed"
    | "newsletter_basic"

export type TransactionalEmailTemplateId =
    | "auth_email_verification"
    | "auth_password_reset"
    | "auth_password_changed"

export type EmailTemplateCategory = "Auth" | "Marketing"

export type EmailTemplateDefinition<Input> = Readonly<{
    id: EmailTemplateId
    name: string
    category: EmailTemplateCategory
    sample_input: Input
    render: (input: Input) => EmailSendInput
}>

export type EmailTemplateTheme = Readonly<{
    brand_name: string
    font_family: string
    text_color: string
    muted_text_color: string
    background_color: string
    content_background_color: string
    muted_background_color: string
    border_color: string
    primary_color: string
    primary_text_color: string
    dark_background_color: string
    dark_text_color: string
    link_color: string
    content_border_radius: number
    button_border_radius: number
}>

export const defaultEmailTemplateTheme: EmailTemplateTheme = {
    brand_name: "URM",
    font_family: "Arial, sans-serif",
    text_color: "#241b2f",
    muted_text_color: "#675b70",
    background_color: "#fff7e9",
    content_background_color: "#ffffff",
    muted_background_color: "#eee5d9",
    border_color: "#241b2f",
    primary_color: "#ff694f",
    primary_text_color: "#241b2f",
    dark_background_color: "#241b2f",
    dark_text_color: "#fff7e9",
    link_color: "#5b45d6",
    content_border_radius: 28,
    button_border_radius: 999,
}

export type EmailTemplatePreview = Readonly<{
    id: EmailTemplateId
    name: string
    category: EmailTemplateCategory
    sample: EmailSendInput
}>

export type AuthVerificationEmailInput = Readonly<{
    copy?: TransactionalCopy
    to: string
    verification_url: string
    expires_minutes: number
    theme?: EmailTemplateTheme
}>

export type PasswordResetEmailInput = Readonly<{
    copy?: TransactionalCopy
    to: string
    reset_url: string
    expires_minutes: number
    theme?: EmailTemplateTheme
}>

export type PasswordChangedEmailInput = Readonly<{
    copy?: TransactionalCopy
    to: string
    login_url: string
    theme?: EmailTemplateTheme
}>

export type NewsletterBasicEmailInput = Readonly<{
    to: EmailSendInput["to"]
    subject: string
    headline: string
    body_text: string
    body_document?: RichTextDocument
    block_document?: EmailNewsletterDocument
    cta_url?: string
    cta_label?: string
    unsubscribe_url?: string
    theme?: EmailTemplateTheme
}>

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

const safe_email_href = (value: string): string | undefined => {
    try {
        const url = new URL(value)
        return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
            ? value
            : undefined
    } catch {
        return undefined
    }
}

const safe_email_image_src = (value: string): string | undefined => {
    try {
        const url = new URL(value)
        return ["https:", "http:"].includes(url.protocol) ? value : undefined
    } catch {
        return undefined
    }
}

const render_rich_text_mark = (
    html: string,
    mark: RichTextMark,
    theme: EmailTemplateTheme
): string => {
    if (mark.type === "bold") return `<strong>${html}</strong>`
    if (mark.type === "italic") return `<em>${html}</em>`

    const href = safe_email_href(mark.href)
    return href === undefined
        ? html
        : `<a style="color: ${escapeHtml(theme.link_color)};" href="${escapeHtml(href)}">${html}</a>`
}

const render_rich_text_node = (
    node: RichTextTextNode,
    theme: EmailTemplateTheme
): string =>
    (node.marks ?? []).reduce(
        (html, mark) => render_rich_text_mark(html, mark, theme),
        escapeHtml(node.text)
    )

const render_rich_text_document = (
    document: RichTextDocument,
    theme: EmailTemplateTheme
): string =>
    document.children
        .map((block) => {
            if (block.type === "image") {
                const src = safe_email_image_src(block.src)
                return src === undefined
                    ? ""
                    : `<p style="margin: 0 0 16px;"><img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" style="display: block; width: 100%; height: auto; border: 0;"></p>`
            }

            const content = block.children
                .map((node) => render_rich_text_node(node, theme))
                .join("")
            if (block.type === "blockquote") {
                return `<blockquote style="margin: 0 0 16px; padding-left: 16px; border-left: 3px solid ${escapeHtml(theme.border_color)}; color: ${escapeHtml(theme.muted_text_color)};">${content}</blockquote>`
            }
            if (block.type === "heading") {
                const font_size =
                    block.level === 1 ? 24 : block.level === 2 ? 20 : 17
                return `<h${block.level + 1} style="margin: 0 0 16px; color: ${escapeHtml(theme.text_color)}; font-size: ${font_size}px; line-height: 1.25;">${content}</h${block.level + 1}>`
            }
            return `<p style="margin: 0 0 16px;">${content || "&nbsp;"}</p>`
        })
        .join("")

const htmlDocument = (
    title: string,
    body: string,
    theme: EmailTemplateTheme = defaultEmailTemplateTheme
): string =>
    `<!doctype html><html><body style="margin: 0; padding: 0; font-family: ${escapeHtml(theme.font_family)}; line-height: 1.5; color: ${escapeHtml(theme.text_color)}; background: ${escapeHtml(theme.background_color)};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; background: ${escapeHtml(theme.background_color)};"><tr><td style="padding: 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 560px; margin: 0 auto; border: 2px solid ${escapeHtml(theme.border_color)}; border-radius: ${theme.content_border_radius}px; background: ${escapeHtml(theme.content_background_color)};"><tr><td style="padding: 32px;"><p style="margin: 0 0 20px; color: ${escapeHtml(theme.muted_text_color)}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(theme.brand_name)}</p><h1 style="margin: 0 0 24px; color: ${escapeHtml(theme.text_color)}; font-size: 30px; line-height: 1.1;">${escapeHtml(title)}</h1>${body}</td></tr></table></td></tr></table></body></html>`

/**
 * Renders a CTA with a validated navigation target. Historical drafts can bypass
 * current write validation, so unsafe URLs become plain labels at render time;
 * attribute escaping alone would leave executable schemes intact.
 */
const themedEmailButton = (
    label: string,
    href: string,
    theme: EmailTemplateTheme
): string => {
    const safe_href = safe_email_href(href)
    if (safe_href === undefined) return escapeHtml(label)
    return `<a style="display: inline-block; padding: 12px 22px; border: 2px solid ${escapeHtml(theme.border_color)}; border-radius: ${theme.button_border_radius}px; color: ${escapeHtml(theme.primary_text_color)}; background: ${escapeHtml(theme.primary_color)}; font-weight: 700; text-decoration: none;" href="${escapeHtml(safe_href)}">${escapeHtml(label)}</a>`
}

export const safe_external_email_image_src = (
    value: string
): string | undefined => {
    try {
        const url = new URL(value)
        const private_storage_host =
            url.hostname !== "fly.storage.tigris.dev" &&
            (url.hostname.endsWith(".tigris.dev") ||
                url.hostname.endsWith(".tigrisdata.cloud"))
        const temporary_signature =
            url.searchParams.has("X-Amz-Signature") ||
            url.searchParams.has("X-Amz-Credential")

        return url.protocol === "https:" &&
            url.username === "" &&
            url.password === "" &&
            !private_storage_host &&
            !temporary_signature
            ? value
            : undefined
    } catch {
        return undefined
    }
}

const newsletter_image_html = (
    src: string,
    alt: string,
    width: number,
    height: number
): string => {
    const safe_src = safe_external_email_image_src(src)
    return safe_src === undefined
        ? ""
        : `<img src="${escapeHtml(safe_src)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" style="display: block; width: 100%; height: auto; border: 0;">`
}

const newsletter_gallery_html = (
    images: ReadonlyArray<EmailNewsletterExternalImage>,
    theme: EmailTemplateTheme
): string => {
    const rows = Array.from(
        { length: Math.ceil(images.length / 2) },
        (_, row_index) => images.slice(row_index * 2, row_index * 2 + 2)
    )
        .map(
            (row) =>
                `<tr>${row
                    .map(
                        (image) =>
                            `<td width="50%" style="width: 50%; padding: 4px; vertical-align: top;">${newsletter_image_html(image.src, image.alt, 240, 160)}</td>`
                    )
                    .join(
                        ""
                    )}${row.length === 1 ? '<td width="50%" style="width: 50%; padding: 4px;"></td>' : ""}</tr>`
        )
        .join("")

    return rows === ""
        ? ""
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 24px; border-collapse: collapse; border: 1px solid ${escapeHtml(theme.border_color)};"><tbody>${rows}</tbody></table>`
}

const render_newsletter_blocks = (
    document: EmailNewsletterDocument,
    theme: EmailTemplateTheme
): string =>
    document.blocks
        .map((block) => {
            switch (block.type) {
                case "rich_text":
                    return render_rich_text_document(block.document, theme)
                case "hero": {
                    const eyebrow =
                        block.eyebrow.trim() === ""
                            ? ""
                            : `<p style="margin: 0 0 8px; color: ${escapeHtml(theme.muted_text_color)}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(block.eyebrow)}</p>`
                    const heading =
                        block.heading.trim() === ""
                            ? ""
                            : `<h2 style="margin: 0 0 12px; color: ${escapeHtml(theme.text_color)}; font-size: 26px; line-height: 1.15;">${escapeHtml(block.heading)}</h2>`
                    const body =
                        block.body.trim() === ""
                            ? ""
                            : `<p style="margin: 0; color: ${escapeHtml(theme.text_color)};">${escapeHtml(block.body).replaceAll("\n", "<br>")}</p>`
                    return `<div style="margin: 0 0 24px; padding: 24px; border-radius: ${theme.content_border_radius}px; background: ${escapeHtml(theme.muted_background_color)};">${eyebrow}${heading}${body}</div>`
                }
                case "call_to_action": {
                    const href = safe_email_href(block.url)
                    const button =
                        href === undefined || block.label.trim() === ""
                            ? ""
                            : `<p style="margin: 16px 0 0;">${themedEmailButton(block.label, href, theme)}</p>`
                    return `<div style="margin: 0 0 24px; padding: 24px; border: 2px solid ${escapeHtml(theme.border_color)}; border-radius: ${theme.content_border_radius}px;"><h2 style="margin: 0 0 8px; font-size: 22px;">${escapeHtml(block.heading)}</h2><p style="margin: 0;">${escapeHtml(block.body).replaceAll("\n", "<br>")}</p>${button}</div>`
                }
                case "testimonial":
                    return `<figure style="margin: 0 0 24px; padding: 24px; text-align: center; background: ${escapeHtml(theme.muted_background_color)}; border-radius: ${theme.content_border_radius}px;"><blockquote style="margin: 0; font-size: 20px; line-height: 1.4;">${escapeHtml(block.quote)}</blockquote><figcaption style="margin-top: 12px; color: ${escapeHtml(theme.muted_text_color)}; font-size: 14px;">${escapeHtml(block.attribution)}</figcaption></figure>`
                case "article_card": {
                    const href = safe_email_href(block.url)
                    const image = newsletter_image_html(
                        block.image.src,
                        block.image.alt,
                        496,
                        248
                    )
                    const kicker =
                        block.kicker.trim() === ""
                            ? ""
                            : `<p style="margin: 16px 0 0; color: ${escapeHtml(theme.primary_color)}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(block.kicker)}</p>`
                    const heading = `<h2 style="margin: 8px 0 0; color: ${escapeHtml(theme.text_color)}; font-size: 22px; line-height: 1.25;">${escapeHtml(block.heading)}</h2>`
                    const linked_heading =
                        href === undefined
                            ? heading
                            : `<a href="${escapeHtml(href)}" style="color: ${escapeHtml(theme.text_color)}; text-decoration: none;">${heading}</a>`
                    const link =
                        href === undefined || block.link_label.trim() === ""
                            ? ""
                            : `<p style="margin: 12px 0 0;"><a href="${escapeHtml(href)}" style="color: ${escapeHtml(theme.link_color)}; font-weight: 700;">${escapeHtml(block.link_label)}</a></p>`
                    return `<article style="margin: 0 0 24px; overflow: hidden; border: 1px solid ${escapeHtml(theme.border_color)}; border-radius: ${theme.content_border_radius}px;">${image}<div style="padding: 20px;">${kicker}${linked_heading}<p style="margin: 8px 0 0; color: ${escapeHtml(theme.muted_text_color)};">${escapeHtml(block.summary).replaceAll("\n", "<br>")}</p>${link}</div></article>`
                }
                case "gallery":
                    return newsletter_gallery_html(block.images, theme)
            }
        })
        .join("")

export const emailVerificationUrl = (app_url: string, token: string): string =>
    `${app_url.replace(/\/$/, "")}/auth/email-verification/?token=${encodeURIComponent(token)}`

export const passwordResetUrl = (app_url: string, token: string): string =>
    `${app_url.replace(/\/$/, "")}/auth/password-reset/?token=${encodeURIComponent(token)}`

export const unsubscribeUrl = (app_url: string, token: string): string =>
    `${app_url.replace(/\/$/, "")}/mail/unsubscribe?token=${encodeURIComponent(token)}`

const renderAuthVerificationEmail = (
    input: AuthVerificationEmailInput
): EmailSendInput => {
    const copy =
        input.copy ?? default_transactional_copy("auth_email_verification")
    const text = [
        copy.heading,
        "",
        `${copy.introduction} ${input.verification_url}`,
        "",
        `This link expires in ${input.expires_minutes} minutes.`,
        "",
        "If you did not request this email, you can ignore it.",
    ].join("\n")

    return {
        to: input.to,
        subject: copy.subject,
        text,
        html: htmlDocument(
            copy.heading,
            `<p>${escapeHtml(copy.introduction).replaceAll("\n", "<br>")}</p><p>${themedEmailButton("Verify email address", input.verification_url, input.theme ?? defaultEmailTemplateTheme)}</p><p>This link expires in ${input.expires_minutes} minutes.</p><p style="color: ${escapeHtml(input.theme?.muted_text_color ?? defaultEmailTemplateTheme.muted_text_color)};">If you did not request this email, you can ignore it.</p>`,
            input.theme
        ),
    }
}

const renderPasswordResetEmail = (
    input: PasswordResetEmailInput
): EmailSendInput => {
    const copy = input.copy ?? default_transactional_copy("auth_password_reset")
    const text = [
        copy.heading,
        "",
        `${copy.introduction} ${input.reset_url}`,
        "",
        `This link expires in ${input.expires_minutes} minutes.`,
        "",
        "If you did not request this email, you can ignore it.",
    ].join("\n")

    return {
        to: input.to,
        subject: copy.subject,
        text,
        html: htmlDocument(
            copy.heading,
            `<p>${escapeHtml(copy.introduction).replaceAll("\n", "<br>")}</p><p>${themedEmailButton("Reset password", input.reset_url, input.theme ?? defaultEmailTemplateTheme)}</p><p>This link expires in ${input.expires_minutes} minutes.</p><p style="color: ${escapeHtml(input.theme?.muted_text_color ?? defaultEmailTemplateTheme.muted_text_color)};">If you did not request this email, you can ignore it.</p>`,
            input.theme
        ),
    }
}

const renderPasswordChangedEmail = (
    input: PasswordChangedEmailInput
): EmailSendInput => {
    const copy =
        input.copy ?? default_transactional_copy("auth_password_changed")
    const text = [
        copy.heading,
        "",
        copy.introduction,
        "",
        `If this was you, no action is needed. You can sign in here: ${input.login_url}`,
        "",
        "If you did not change your password, contact support immediately.",
    ].join("\n")

    return {
        to: input.to,
        subject: copy.subject,
        text,
        html: htmlDocument(
            copy.heading,
            `<p>${escapeHtml(copy.introduction).replaceAll("\n", "<br>")}</p><p>If this was you, no action is needed. You can <a style="color: ${escapeHtml(input.theme?.link_color ?? defaultEmailTemplateTheme.link_color)};" href="${escapeHtml(input.login_url)}">sign in here</a>.</p><p>If you did not change your password, contact support immediately.</p>`,
            input.theme
        ),
    }
}

const renderNewsletterBasicEmail = (
    input: NewsletterBasicEmailInput
): EmailSendInput => {
    const theme = input.theme ?? defaultEmailTemplateTheme
    const ctaText =
        input.cta_url === undefined
            ? []
            : ["", `${input.cta_label ?? "Read more"}: ${input.cta_url}`]
    const unsubscribeText =
        input.unsubscribe_url === undefined
            ? []
            : ["", `Unsubscribe: ${input.unsubscribe_url}`]
    const body_text =
        input.block_document === undefined
            ? input.body_text
            : emailNewsletterBlocksPlainText(input.block_document)
    const text = [
        input.headline,
        "",
        body_text,
        ...ctaText,
        "",
        "You are receiving this because you are subscribed to URM updates.",
        ...unsubscribeText,
    ].join("\n")
    const ctaHtml =
        input.cta_url === undefined
            ? ""
            : `<p>${themedEmailButton(input.cta_label ?? "Read more", input.cta_url, input.theme ?? defaultEmailTemplateTheme)}</p>`
    const unsubscribeHtml =
        input.unsubscribe_url === undefined
            ? ""
            : `<p style="font-size: 12px; color: ${escapeHtml(input.theme?.text_color ?? defaultEmailTemplateTheme.text_color)};"><a style="color: ${escapeHtml(input.theme?.link_color ?? defaultEmailTemplateTheme.link_color)};" href="${escapeHtml(input.unsubscribe_url)}">Unsubscribe</a></p>`
    const body_html =
        input.block_document !== undefined
            ? render_newsletter_blocks(input.block_document, theme)
            : input.body_document === undefined
              ? `<p>${escapeHtml(input.body_text).replaceAll("\n", "<br>")}</p>`
              : render_rich_text_document(input.body_document, theme)

    return {
        to: input.to,
        subject: input.subject,
        text,
        html: htmlDocument(
            input.headline,
            `${body_html}${ctaHtml}<p>You are receiving this because you are subscribed to URM updates.</p>${unsubscribeHtml}`,
            input.theme
        ),
    }
}

export const authEmailVerificationTemplate: EmailTemplateDefinition<AuthVerificationEmailInput> =
    {
        id: "auth_email_verification",
        name: "Auth Email Verification",
        category: "Auth",
        sample_input: {
            to: "person@example.com",
            verification_url:
                "https://app.example.com/auth/email-verification/?token=sample",
            expires_minutes: 1440,
        },
        render: renderAuthVerificationEmail,
    }

export const authPasswordResetTemplate: EmailTemplateDefinition<PasswordResetEmailInput> =
    {
        id: "auth_password_reset",
        name: "Auth Password Reset",
        category: "Auth",
        sample_input: {
            to: "person@example.com",
            reset_url:
                "https://app.example.com/auth/password-reset/?token=sample",
            expires_minutes: 30,
        },
        render: renderPasswordResetEmail,
    }

export const authPasswordChangedTemplate: EmailTemplateDefinition<PasswordChangedEmailInput> =
    {
        id: "auth_password_changed",
        name: "Auth Password Changed",
        category: "Auth",
        sample_input: {
            to: "person@example.com",
            login_url: "https://app.example.com/auth/login/",
        },
        render: renderPasswordChangedEmail,
    }

export const newsletterBasicTemplate: EmailTemplateDefinition<NewsletterBasicEmailInput> =
    {
        id: "newsletter_basic",
        name: "Newsletter Basic",
        category: "Marketing",
        sample_input: {
            to: "person@example.com",
            subject: "URM update",
            headline: "Latest from URM",
            body_text: "A short update for subscribed contacts.",
            cta_url: "https://app.example.com/",
            cta_label: "Open URM",
            unsubscribe_url:
                "https://app.example.com/mail/unsubscribe?token=sample",
        },
        render: renderNewsletterBasicEmail,
    }

export const productionEmailTemplatePreviewsForTheme = (
    theme: EmailTemplateTheme
): ReadonlyArray<EmailTemplatePreview> => [
    {
        id: authEmailVerificationTemplate.id,
        name: authEmailVerificationTemplate.name,
        category: authEmailVerificationTemplate.category,
        sample: authEmailVerificationTemplate.render({
            ...authEmailVerificationTemplate.sample_input,
            theme,
        }),
    },
    {
        id: authPasswordResetTemplate.id,
        name: authPasswordResetTemplate.name,
        category: authPasswordResetTemplate.category,
        sample: authPasswordResetTemplate.render({
            ...authPasswordResetTemplate.sample_input,
            theme,
        }),
    },
    {
        id: authPasswordChangedTemplate.id,
        name: authPasswordChangedTemplate.name,
        category: authPasswordChangedTemplate.category,
        sample: authPasswordChangedTemplate.render({
            ...authPasswordChangedTemplate.sample_input,
            theme,
        }),
    },
    {
        id: newsletterBasicTemplate.id,
        name: newsletterBasicTemplate.name,
        category: newsletterBasicTemplate.category,
        sample: newsletterBasicTemplate.render({
            ...newsletterBasicTemplate.sample_input,
            theme,
        }),
    },
]

export const transactionalEmailTemplatePreviews: ReadonlyArray<EmailTemplatePreview> =
    productionEmailTemplatePreviewsForTheme(defaultEmailTemplateTheme).filter(
        (template) => template.id !== "newsletter_basic"
    )

export const productionEmailTemplatePreviews =
    productionEmailTemplatePreviewsForTheme(defaultEmailTemplateTheme)

export const transactionalTemplateTestEmail = (
    template_id: TransactionalEmailTemplateId,
    to: string,
    theme?: EmailTemplateTheme,
    copy?: TransactionalCopy
): EmailSendInput => {
    switch (template_id) {
        case "auth_email_verification":
            return authVerificationEmail({
                ...(copy === undefined ? {} : { copy }),
                to,
                verification_url: "https://urm.dev/",
                ...(theme === undefined ? {} : { theme }),
                expires_minutes: 1_440,
            })
        case "auth_password_reset":
            return passwordResetEmail({
                ...(copy === undefined ? {} : { copy }),
                to,
                reset_url: "https://urm.dev/",
                ...(theme === undefined ? {} : { theme }),
                expires_minutes: 30,
            })
        case "auth_password_changed":
            return passwordChangedEmail({
                ...(copy === undefined ? {} : { copy }),
                to,
                login_url: "https://urm.dev/",
                ...(theme === undefined ? {} : { theme }),
            })
    }
}

export const authVerificationEmail = authEmailVerificationTemplate.render
export const passwordResetEmail = authPasswordResetTemplate.render
export const passwordChangedEmail = authPasswordChangedTemplate.render
export const newsletterBasicEmail = newsletterBasicTemplate.render
