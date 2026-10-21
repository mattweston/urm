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
                                fontSize: "24px",
                                fontWeight: "700",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        ["Your order has shipped"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "Hi there, your order is on its way. You can track your package using the link below.",
                    ]),
                    h.table(
                        [
                            h.Style({
                                width: "100%",
                                borderCollapse: "collapse",
                                borderSpacing: "0",
                                margin: "24px 0",
                            }),
                        ],
                        [
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [h.Style({ paddingBottom: "8px" })],
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
                                                ["Order"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                        fontWeight: "600",
                                                    }),
                                                ],
                                                ["#ML4F5L8522"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                paddingBottom: "8px",
                                                textAlign: "right",
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
                                                ["Carrier"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                        fontWeight: "600",
                                                    }),
                                                ],
                                                ["FedEx Ground"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [h.Style({ paddingTop: "8px" })],
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
                                                ["Tracking Number"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                        fontWeight: "600",
                                                    }),
                                                ],
                                                ["1Z999AA10123456784"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                paddingTop: "8px",
                                                textAlign: "right",
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
                                                ["Est. Delivery"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class("text-foreground"),
                                                    h.Style({
                                                        fontSize: "14px",
                                                        margin: "0",
                                                        fontWeight: "600",
                                                    }),
                                                ],
                                                ["Jun 12, 2026"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Style({ margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/track/1Z999AA10123456784",
                                    borderRadius: 6,
                                    width: 220,
                                    height: 44,
                                    fontSize: 14,
                                },
                                ["Track Your Package"]
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
                            "Need help with your delivery? Contact our support team at ",
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
