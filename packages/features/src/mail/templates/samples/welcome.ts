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
                    emailText({}, [
                        "Thanks for signing up. Your account is now ready to use.",
                    ]),
                    emailText({}, [
                        "You can view your dashboard and manage your account right from your account page.",
                    ]),
                    h.div(
                        [h.Style({ textAlign: "left", margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/dashboard",
                                    borderRadius: 5,
                                    width: 300,
                                    height: 40,
                                    fontSize: 14,
                                },
                                ["View Your Dashboard"]
                            ),
                        ]
                    ),
                    emailText({}, [
                        "If you have any questions, you can find answers on our ",
                        h.a(
                            [
                                h.Href("https://example.com/help"),
                                h.Class("text-primary underline"),
                            ],
                            ["support site"]
                        ),
                        ".",
                    ]),
                    emailText({}, ["— The team at Your Company"]),
                    emailHr(),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                lineHeight: "16px",
                                margin: "0",
                            }),
                        ],
                        [
                            "Your Company, 123 Example St, Suite 100, San Francisco, CA 94103",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
