import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailContainer, emailSection, emailText } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    border: "1px solid",
                    borderRadius: "6px",
                    maxWidth: "400px",
                    margin: "0 auto",
                },
                [
                    h.div(
                        [
                            h.Style({
                                textAlign: "center",
                                marginBottom: "16px",
                            }),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "bg-primary text-primary-foreground"
                                    ),
                                    h.Style({
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "50%",
                                        margin: "0 auto",
                                        lineHeight: "48px",
                                        fontSize: "18px",
                                        fontWeight: "700",
                                        textAlign: "center",
                                    }),
                                ],
                                ["YC"]
                            ),
                        ]
                    ),
                    emailText(
                        {
                            className: "text-primary font-semibold uppercase",
                            style: {
                                margin: "0 0 8px 0",
                                fontSize: "11px",
                                letterSpacing: "0.05em",
                                textAlign: "center",
                            },
                        },
                        ["Verify Your Identity"]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "16px",
                                lineHeight: "24px",
                                margin: "0 0 16px 0",
                                textAlign: "center",
                            }),
                        ],
                        [
                            "Enter the following code to finish linking your account.",
                        ]
                    ),
                    emailSection(
                        {
                            className: "bg-muted",
                            cellStyle: {
                                padding: "16px",
                                textAlign: "center",
                                borderRadius: "4px",
                            },
                        },
                        [
                            h.p(
                                [
                                    h.Class("text-foreground"),
                                    h.Style({
                                        fontSize: "32px",
                                        fontWeight: "700",
                                        letterSpacing: "6px",
                                        margin: "0",
                                        fontFamily: "monospace",
                                    }),
                                ],
                                ["144833"]
                            ),
                        ]
                    ),
                    emailText(
                        {
                            className: "text-muted-foreground",
                            style: {
                                margin: "16px 0 0 0",
                                fontSize: "14px",
                                textAlign: "center",
                            },
                        },
                        ["Not expecting this email?"]
                    ),
                    emailText(
                        {
                            className: "text-muted-foreground",
                            style: {
                                margin: "4px 0 0 0",
                                fontSize: "14px",
                                textAlign: "center",
                            },
                        },
                        [
                            "Contact ",
                            h.a(
                                [
                                    h.Href("mailto:support@example.com"),
                                    h.Class("text-primary underline"),
                                ],
                                ["support@example.com"]
                            ),
                            " if you did not request this code.",
                        ]
                    ),
                ],
                { padding: "40px 24px" }
            ),
            h.p(
                [
                    h.Class("text-muted-foreground"),
                    h.Style({
                        fontSize: "12px",
                        textAlign: "center",
                        margin: "20px 0 0 0",
                        fontWeight: "700",
                    }),
                ],
                ["Securely powered by Your Company"]
            ),
        ]
    )
