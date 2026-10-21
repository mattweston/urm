import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailButton, emailContainer, emailHr, emailText } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {},
                [
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "20px",
                                fontWeight: "700",
                                margin: "0 0 8px 0",
                            }),
                        ],
                        ["New sign-in detected"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "We noticed a new sign-in to your account from a device we don't recognize. If this was you, you can safely ignore this email.",
                    ]),
                    h.table(
                        [
                            h.Style({
                                width: "100%",
                                borderCollapse: "collapse",
                                borderSpacing: "0",
                                margin: "16px 0",
                            }),
                        ],
                        [
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "8px 0",
                                                borderBottom: "1px solid",
                                                borderColor:
                                                    "hsl(var(--border))",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                    h.Style({
                                                        fontSize: "12px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["When"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "8px 0",
                                                borderBottom: "1px solid",
                                                borderColor:
                                                    "hsl(var(--border))",
                                                textAlign: "right",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["Jun 9, 2026 at 14:32"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "8px 0",
                                                borderBottom: "1px solid",
                                                borderColor:
                                                    "hsl(var(--border))",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                    h.Style({
                                                        fontSize: "12px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["Where"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "8px 0",
                                                borderBottom: "1px solid",
                                                borderColor:
                                                    "hsl(var(--border))",
                                                textAlign: "right",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["San Francisco, CA, US"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [h.Style({ padding: "8px 0" })],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                    h.Style({
                                                        fontSize: "12px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["Device"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "8px 0",
                                                textAlign: "right",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["Chrome on macOS"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    emailText({ style: { margin: "16px 0" } }, [
                        "If you didn't sign in, please secure your account immediately by changing your password.",
                    ]),
                    h.div(
                        [h.Style({ margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/security",
                                    borderRadius: 6,
                                    width: 200,
                                    height: 40,
                                    fontSize: 14,
                                },
                                ["Review Account Security"]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                lineHeight: "18px",
                                margin: "0",
                            }),
                        ],
                        [
                            "This email was sent to you because of a security event on your account. Need help? Contact ",
                            h.a(
                                [
                                    h.Href("mailto:support@example.com"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["support@example.com"]
                            ),
                            ".",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
