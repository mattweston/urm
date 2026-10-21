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
                    h.div(
                        [
                            h.Style({
                                textAlign: "center",
                                marginBottom: "24px",
                            }),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "bg-destructive text-destructive-foreground"
                                    ),
                                    h.Style({
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "50%",
                                        margin: "0 auto",
                                        lineHeight: "48px",
                                        fontSize: "24px",
                                        textAlign: "center",
                                    }),
                                ],
                                ["!"]
                            ),
                        ]
                    ),
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "24px",
                                fontWeight: "700",
                                margin: "0 0 16px 0",
                                textAlign: "center",
                            }),
                        ],
                        ["Payment Failed"]
                    ),
                    emailText(
                        { style: { textAlign: "center", margin: "0 0 8px 0" } },
                        [
                            "We were unable to process your payment for the Pro Plan Subscription.",
                        ]
                    ),
                    emailText({ style: { textAlign: "center", margin: "0" } }, [
                        "Your card ending in 4242 was declined. Please update your payment method to avoid any interruption to your service.",
                    ]),
                    h.div(
                        [h.Style({ textAlign: "center", margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/billing",
                                    borderRadius: 6,
                                    width: 240,
                                    height: 44,
                                    fontSize: 14,
                                },
                                ["Update Payment Method"]
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
                            "If you have any questions, contact our billing team at ",
                            h.a(
                                [
                                    h.Href("mailto:billing@example.com"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["billing@example.com"]
                            ),
                            ".",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
