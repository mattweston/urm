import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailContainer, emailHr, emailSection } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    maxWidth: "600px",
                    margin: "0 auto",
                },
                [
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "36px",
                                fontWeight: "700",
                                margin: "30px 0",
                                padding: "0",
                                lineHeight: "42px",
                            }),
                        ],
                        ["Confirm your email address"]
                    ),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "20px",
                                lineHeight: "28px",
                                marginBottom: "30px",
                            }),
                        ],
                        [
                            "Your confirmation code is below. Enter it in your open browser window and we'll help you get signed in.",
                        ]
                    ),
                    emailSection(
                        {
                            className: "bg-muted",
                            style: {
                                borderRadius: "4px",
                                margin: "16px auto 14px",
                                padding: "43px 23px",
                            },
                        },
                        [
                            h.p(
                                [
                                    h.Class("text-foreground"),
                                    h.Style({
                                        fontSize: "30px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                        margin: "0",
                                        fontFamily: "monospace",
                                        letterSpacing: "4px",
                                        fontWeight: "600",
                                    }),
                                ],
                                ["DJZ-TLX"]
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
                            "If you didn't request this email, there's nothing to worry about — you can safely ignore it.",
                        ]
                    ),
                    emailHr({ margin: "32px 0" }),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                lineHeight: "15px",
                                margin: "0",
                            }),
                        ],
                        [
                            "Your Company, Inc. · 123 Example St, San Francisco, CA 94103, USA",
                        ]
                    ),
                ],
                { padding: "32px 24px" }
            ),
        ]
    )
