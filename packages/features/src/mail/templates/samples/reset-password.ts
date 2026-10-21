import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailButton, emailContainer, emailText } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    border: "1px solid",
                    maxWidth: "600px",
                    margin: "0 auto",
                },
                [
                    emailText({}, ["Hi there,"]),
                    emailText({}, [
                        "Someone recently requested a password change for your account. If this was you, you can set a new password here:",
                    ]),
                    h.div(
                        [h.Style({ margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/reset-password",
                                    borderRadius: 4,
                                    width: 210,
                                    height: 42,
                                    fontSize: 15,
                                },
                                ["Reset password"]
                            ),
                        ]
                    ),
                    emailText({}, [
                        "If you don't want to change your password or didn't request this, just ignore and delete this message.",
                    ]),
                    emailText({ style: { margin: "0" } }, [
                        "To keep your account secure, please don't forward this email to anyone. See our ",
                        h.a(
                            [
                                h.Href("https://example.com/help"),
                                h.Class("text-primary underline"),
                            ],
                            ["Help Center"]
                        ),
                        " for more security tips.",
                    ]),
                ],
                { padding: "40px" }
            ),
        ]
    )
