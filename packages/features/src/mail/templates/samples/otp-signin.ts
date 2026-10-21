import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import {
    emailButton,
    emailContainer,
    emailSection,
    emailText,
} from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {},
                [
                    emailText({ style: { margin: "0 0 24px 0" } }, [
                        "Hi there,",
                    ]),
                    emailText({ style: { margin: "0 0 32px 0" } }, [
                        "Use the verification code below to sign in to your account:",
                    ]),
                    emailSection(
                        {
                            className: "bg-muted",
                            cellStyle: { padding: "16px", borderRadius: "4px" },
                        },
                        [
                            h.p(
                                [
                                    h.Class("text-foreground"),
                                    h.Style({
                                        fontSize: "24px",
                                        fontWeight: "700",
                                        letterSpacing: "4px",
                                        margin: "0",
                                        fontFamily: "monospace",
                                    }),
                                ],
                                ["839471"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Style({ margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/login",
                                    borderRadius: 4,
                                    width: 220,
                                    height: 44,
                                    fontSize: 15,
                                },
                                ["Sign in with one click"]
                            ),
                        ]
                    ),
                    emailText(
                        {
                            className: "text-muted-foreground",
                            style: {
                                margin: "0",
                                fontSize: "14px",
                                lineHeight: "1.5",
                            },
                        },
                        [
                            "If you didn't request this email, you can safely ignore it. The verification code will expire automatically.",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
