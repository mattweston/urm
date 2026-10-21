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
                    maxWidth: "580px",
                    margin: "0 auto",
                },
                [
                    h.div(
                        [h.Style({ paddingBottom: "20px" })],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "bg-primary text-primary-foreground"
                                    ),
                                    h.Style({
                                        width: "96px",
                                        height: "30px",
                                        borderRadius: "4px",
                                        lineHeight: "30px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        textAlign: "center",
                                        letterSpacing: "1px",
                                    }),
                                ],
                                ["YOUR COMPANY"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Style({
                                textAlign: "center",
                                paddingBottom: "16px",
                            }),
                        ],
                        [
                            h.div(
                                [
                                    h.Class("bg-muted text-muted-foreground"),
                                    h.Style({
                                        width: "96px",
                                        height: "96px",
                                        borderRadius: "50%",
                                        margin: "0 auto",
                                        lineHeight: "96px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        textAlign: "center",
                                    }),
                                ],
                                ["Avatar"]
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "32px",
                                lineHeight: "1.3",
                                fontWeight: "700",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        ["Here's what Jane wrote"]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground bg-muted"),
                            h.Style({
                                fontSize: "18px",
                                lineHeight: "1.4",
                                padding: "24px",
                                borderRadius: "4px",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        [
                            '"Absolutely fantastic experience! The team went above and beyond. Would highly recommend to anyone looking for quality service."',
                        ]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "18px",
                                lineHeight: "1.4",
                                margin: "0 0 24px 0",
                            }),
                        ],
                        [
                            "Now that the review period is over, we've posted Jane's review to your profile.",
                        ]
                    ),
                    h.div(
                        [h.Style({ margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/review",
                                    borderRadius: 3,
                                    width: 300,
                                    height: 60,
                                    fontSize: 18,
                                },
                                ["Send My Feedback"]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "18px",
                                lineHeight: "1.4",
                                fontWeight: "700",
                                margin: "0 0 12px 0",
                            }),
                        ],
                        ["Common questions"]
                    ),
                    h.p(
                        [h.Style({ margin: "0 0 8px 0" })],
                        [
                            h.a(
                                [
                                    h.Href("https://example.com/help"),
                                    h.Class("text-primary no-underline"),
                                    h.Style({
                                        fontSize: "18px",
                                        lineHeight: "1.4",
                                        display: "block",
                                    }),
                                ],
                                ["How do reviews work?"]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({ fontSize: "14px", margin: "0 0 10px 0" }),
                        ],
                        [
                            "Your Company, Inc., 123 Example St, San Francisco, CA 94103",
                        ]
                    ),
                    h.a(
                        [
                            h.Href("https://example.com"),
                            h.Class("text-muted-foreground underline"),
                            h.Style({ fontSize: "14px" }),
                        ],
                        ["Report unsafe behavior"]
                    ),
                ],
                { padding: "20px 24px" }
            ),
        ]
    )
