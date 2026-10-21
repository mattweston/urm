import { describe, expect, it } from "@effect/vitest"
import {
    authEmailVerificationTemplate,
    authPasswordChangedTemplate,
    authPasswordResetTemplate,
    authVerificationEmail,
    defaultEmailTemplateTheme,
    emailVerificationUrl,
    newsletterBasicEmail,
    newsletterBasicTemplate,
    passwordResetEmail,
    passwordResetUrl,
    safe_external_email_image_src,
    productionEmailTemplatePreviews,
    transactionalEmailTemplatePreviews,
    transactionalTemplateTestEmail,
} from "../src/templates.ts"

describe("@urm/email - auth templates", () => {
    it("omits newsletter CTA anchors with unsafe protocols", () => {
        for (const cta_url of [
            "javascript:void(0)",
            "data:text/plain,hello",
            "java\nscript:void(0)",
        ]) {
            const email = newsletterBasicTemplate.render({
                ...newsletterBasicTemplate.sample_input,
                cta_url,
                cta_label: "Read more",
            })
            expect(email.html).not.toMatch(
                /href="(?:javascript|data|java\nscript):/
            )
            expect(email.html).toContain("Read more")
        }
        const safe = newsletterBasicTemplate.render({
            ...newsletterBasicTemplate.sample_input,
            cta_url: "https://example.test/read",
            cta_label: "Read more",
        })
        expect(safe.html).toContain('href="https://example.test/read"')
    })
    it("accepts unsigned public Tigris images but never signed previews", () => {
        const url =
            "https://fly.storage.tigris.dev/urm-dev/domains/example/gallery/image"
        expect(safe_external_email_image_src(url)).toBe(url)
        for (const invalid of [
            `${url}?X-Amz-Signature=temporary`,
            `${url}?X-Amz-Credential=temporary`,
            "https://bucket.tigris.dev/private.jpg",
            "https://user:password@fly.storage.tigris.dev/image",
            "http://fly.storage.tigris.dev/image",
        ])
            expect(safe_external_email_image_src(invalid)).toBeUndefined()
    })
    it("builds email verification URLs", () => {
        expect(
            emailVerificationUrl("https://app.example.com/", "token value")
        ).toBe(
            "https://app.example.com/auth/email-verification/?token=token%20value"
        )
    })

    it("builds password reset URLs", () => {
        expect(passwordResetUrl("https://app.example.com", "reset/value")).toBe(
            "https://app.example.com/auth/password-reset/?token=reset%2Fvalue"
        )
    })

    it("renders verification email without leaking unrelated data", () => {
        const email = authVerificationEmail({
            to: "person@example.com",
            verification_url:
                "https://app.example.com/auth/email-verification/?token=abc",
            expires_minutes: 1440,
        })

        expect(email.subject).toBe("Confirm your email address")
        expect(email.text).toContain(
            "https://app.example.com/auth/email-verification/?token=abc"
        )
        expect(email.html).toContain("Verify email address")
        expect(email.html).toContain("border: 2px solid #241b2f")
        expect(email.html).toContain("background: #ff694f")
        expect(email.html).not.toContain("box-shadow")
    })

    it("renders password reset email", () => {
        const email = passwordResetEmail({
            to: "person@example.com",
            reset_url: "https://app.example.com/auth/password-reset/?token=abc",
            expires_minutes: 30,
        })

        expect(email.subject).toBe("Reset your password")
        expect(email.text).toContain("This link expires in 30 minutes.")
        expect(email.html).toContain("Reset password")
    })

    it("exposes production template previews", () => {
        expect(
            productionEmailTemplatePreviews.map((template) => template.id)
        ).toEqual([
            "auth_email_verification",
            "auth_password_reset",
            "auth_password_changed",
            "newsletter_basic",
        ])
        expect(
            authEmailVerificationTemplate.render(
                authEmailVerificationTemplate.sample_input
            ).subject
        ).toBe("Confirm your email address")
        expect(
            authPasswordResetTemplate.render(
                authPasswordResetTemplate.sample_input
            ).subject
        ).toBe("Reset your password")
        expect(
            authPasswordChangedTemplate.render(
                authPasswordChangedTemplate.sample_input
            ).subject
        ).toBe("Your password was changed")
        expect(
            newsletterBasicTemplate.render(newsletterBasicTemplate.sample_input)
                .subject
        ).toBe("URM update")
    })

    it("renders safe transactional test templates for a real recipient", () => {
        expect(transactionalEmailTemplatePreviews.map(({ id }) => id)).toEqual([
            "auth_email_verification",
            "auth_password_reset",
            "auth_password_changed",
        ])

        const email = transactionalTemplateTestEmail(
            "auth_password_reset",
            "test@example.com"
        )

        expect(email.to).toBe("test@example.com")
        expect(email.subject).toBe("Reset your password")
        expect(email.text).toContain("https://urm.dev/")
        expect(email.html).toContain("Reset password")
    })

    it("renders newsletter HTML and plain text", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Hello subscribers",
            body_text: "First line\nSecond line",
            cta_url: "https://app.example.com/news",
            cta_label: "Read update",
        })

        expect(email.subject).toBe("Newsletter")
        expect(email.text).toContain("First line\nSecond line")
        expect(email.text).toContain(
            "Read update: https://app.example.com/news"
        )
        expect(email.html).toContain("First line<br>Second line")
        expect(email.html).toContain("Read update")
    })

    it("renders structured newsletter blocks and keeps a plain-text fallback", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Hello subscribers",
            body_text: "Formatted update",
            body_document: {
                type: "doc",
                children: [
                    {
                        type: "heading",
                        level: 1,
                        children: [{ type: "text", text: "Update" }],
                    },
                    {
                        type: "paragraph",
                        children: [
                            {
                                type: "text",
                                text: "Saved link",
                                marks: [
                                    {
                                        type: "link",
                                        href: "https://example.com/update",
                                    },
                                    { type: "bold" },
                                ],
                            },
                        ],
                    },
                ],
            },
        })

        expect(email.text).toContain("Formatted update")
        expect(email.html).toContain("<h2")
        expect(email.html).toContain("<strong>")
        expect(email.html).toContain('href="https://example.com/update"')
    })

    it("renders ordered visual newsletter blocks in HTML and plain text", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Hello subscribers",
            body_text: "",
            block_document: {
                schema_version: 2,
                blocks: [
                    {
                        block_id: "testimonial",
                        type: "testimonial",
                        quote: "A useful product.",
                        attribution: "A customer",
                    },
                    {
                        block_id: "cta",
                        type: "call_to_action",
                        heading: "Continue",
                        body: "See the complete update.",
                        label: "Read more",
                        url: "https://example.com/update",
                    },
                ],
            },
        })

        expect(email.text).toContain("A useful product.\nA customer")
        expect(email.text).toContain("Read more: https://example.com/update")
        const html = email.html ?? ""
        expect(html.indexOf("A useful product.")).toBeLessThan(
            html.indexOf("Continue")
        )
        expect(email.html).toContain('href="https://example.com/update"')
    })

    it("renders article and gallery images only from durable HTTPS sources", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Visual update",
            body_text: "",
            block_document: {
                schema_version: 2,
                blocks: [
                    {
                        block_id: "article",
                        type: "article_card",
                        image: {
                            image_id: "article-image",
                            source: "external_https",
                            src: "https://images.example.com/article.jpg",
                            alt: "Article preview",
                        },
                        kicker: "Guide",
                        heading: "A useful guide",
                        summary: "A short summary.",
                        link_label: "Read guide",
                        url: "https://example.com/guide",
                    },
                    {
                        block_id: "gallery",
                        type: "gallery",
                        images: [
                            {
                                image_id: "safe",
                                source: "external_https",
                                src: "https://images.example.com/safe.jpg",
                                alt: "Safe image",
                            },
                            {
                                image_id: "private",
                                source: "external_https",
                                src: "https://bucket.tigris.dev/private.jpg",
                                alt: "Private image",
                            },
                            {
                                image_id: "temporary",
                                source: "external_https",
                                src: "https://images.example.com/temp.jpg?X-Amz-Signature=temporary",
                                alt: "Temporary image",
                            },
                        ],
                    },
                ],
            },
        })
        const html = email.html ?? ""

        expect(html).toContain("images.example.com/article.jpg")
        expect(html).toContain("images.example.com/safe.jpg")
        expect(html).not.toContain("bucket.tigris.dev")
        expect(html).not.toContain("X-Amz-Signature")
        expect(html).toContain('width="496" height="248"')
        expect(email.text).toContain("[Image: Article preview]")
        expect(email.text).toContain("[Image: Safe image]")
    })

    it("does not render unsafe rich-text link schemes", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Hello subscribers",
            body_text: "Open link",
            body_document: {
                type: "doc",
                children: [
                    {
                        type: "paragraph",
                        children: [
                            {
                                type: "text",
                                text: "Open link",
                                marks: [
                                    {
                                        type: "link",
                                        href: "javascript:alert(1)",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        })

        expect(email.html).toContain("Open link")
        expect(email.html).not.toContain("javascript:")
    })

    it("does not render non-web rich-text image sources", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "Hello subscribers",
            body_text: "Image description",
            body_document: {
                type: "doc",
                children: [
                    {
                        type: "image",
                        src: "data:image/svg+xml,<svg></svg>",
                        alt: "Image description",
                    },
                ],
            },
        })

        expect(email.html).not.toContain("data:image")
        expect(email.text).toContain("Image description")
    })

    it("uses explicit email theme tokens for production HTML", () => {
        const email = authVerificationEmail({
            to: "person@example.com",
            verification_url:
                "https://app.example.com/auth/email-verification/?token=abc",
            expires_minutes: 1440,
            theme: {
                ...defaultEmailTemplateTheme,
                text_color: "#000001",
                background_color: "#000002",
                content_background_color: "#000003",
                link_color: "#000004",
                border_color: "#000005",
                primary_color: "#000006",
            },
        })

        expect(email.html).toContain("color: #000001")
        expect(email.html).toContain("background: #000002")
        expect(email.html).toContain("background: #000003")
        expect(email.html).toContain("border: 2px solid #000005")
        expect(email.html).toContain("background: #000006")
    })

    it("escapes untrusted newsletter content, URLs, and theme values in HTML", () => {
        const email = newsletterBasicEmail({
            to: "person@example.com",
            subject: "Newsletter",
            headline: "<img src=x onerror=alert(1)>",
            body_text: "<script>alert(1)</script>",
            cta_url: 'https://app.example.com/?q="<script>',
            cta_label: "<b>Read</b>",
            unsubscribe_url: 'https://app.example.com/unsubscribe?x="<script>',
            theme: {
                ...defaultEmailTemplateTheme,
                link_color: '" onmouseover=alert(1)',
            },
        })

        expect(email.html).not.toContain("<script>")
        expect(email.html).not.toContain("<img src=x")
        expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
        expect(email.html).toContain("&quot;&lt;script&gt;")
        expect(email.html).toContain("&lt;b&gt;Read&lt;/b&gt;")
        expect(email.text).toContain("<script>alert(1)</script>")
    })
})
