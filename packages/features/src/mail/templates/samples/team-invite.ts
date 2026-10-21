import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailButton, emailContainer, emailHr } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    maxWidth: "465px",
                    margin: "40px auto",
                    border: "1px solid",
                    borderRadius: "6px",
                },
                [
                    h.div(
                        [
                            h.Style({
                                textAlign: "center",
                                padding: "32px 0 24px",
                            }),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "bg-primary text-primary-foreground"
                                    ),
                                    h.Style({
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        margin: "0 auto",
                                        lineHeight: "40px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        textAlign: "center",
                                    }),
                                ],
                                ["YC"]
                            ),
                        ]
                    ),
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "24px",
                                fontWeight: "400",
                                margin: "0 0 16px 0",
                                padding: "0",
                                textAlign: "center",
                            }),
                        ],
                        [
                            "Join ",
                            h.strong([], ["Engineering"]),
                            " on ",
                            h.strong([], ["Your Company"]),
                        ]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "14px",
                                lineHeight: "24px",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        ["Hello there,"]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "14px",
                                lineHeight: "24px",
                                margin: "0 0 24px 0",
                            }),
                        ],
                        [
                            h.strong([], ["jane"]),
                            " (",
                            h.a(
                                [
                                    h.Href("mailto:jane@example.com"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["jane@example.com"]
                            ),
                            ") has invited you to the ",
                            h.strong([], ["Engineering"]),
                            " team on ",
                            h.strong([], ["Your Company"]),
                            ".",
                        ]
                    ),
                    h.div(
                        [h.Style({ textAlign: "center", margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/invite",
                                    borderRadius: 4,
                                    width: 120,
                                    height: 38,
                                    fontSize: 13,
                                },
                                ["Join the team"]
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "14px",
                                lineHeight: "24px",
                                margin: "0",
                            }),
                        ],
                        [
                            "or copy and paste this URL into your browser: ",
                            h.a(
                                [
                                    h.Href("https://example.com/invite"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["https://example.com/invite"]
                            ),
                        ]
                    ),
                    emailHr({ margin: "26px 0" }),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                lineHeight: "24px",
                                margin: "0",
                            }),
                        ],
                        [
                            "This invitation was intended for ",
                            h.span(
                                [h.Class("text-foreground font-medium")],
                                ["batman"]
                            ),
                            ". This invite was sent from ",
                            h.span(
                                [h.Class("text-foreground font-medium")],
                                ["123.45.678.910"]
                            ),
                            " located in ",
                            h.span(
                                [h.Class("text-foreground font-medium")],
                                ["Gotham City"]
                            ),
                            ". If you were not expecting this invitation, you can ignore this email.",
                        ]
                    ),
                ],
                { padding: "20px" }
            ),
        ]
    )
