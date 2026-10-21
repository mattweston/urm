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
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "20px",
                                fontWeight: "700",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        ["Your domain is verified"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "Your domain ",
                        h.strong([h.Class("text-foreground")], ["example.com"]),
                        " is now verified on URM. You can start sending emails from this domain right away.",
                    ]),
                    emailSection(
                        {
                            className:
                                "bg-muted border-(length:--surface-border-width) border-border",
                            cellStyle: {
                                padding: "12px 16px",
                                borderRadius: "4px",
                            },
                        },
                        [
                            emailText(
                                {
                                    className: "text-foreground",
                                    style: { margin: "0", fontSize: "14px" },
                                },
                                [
                                    "Status: ",
                                    h.strong(
                                        [h.Class("text-primary")],
                                        ["Verified"]
                                    ),
                                    " — DNS records confirmed",
                                ]
                            ),
                        ]
                    ),
                    emailText({ style: { margin: "16px 0 0 0" } }, [
                        "Open your domain settings to review records and configure additional options.",
                    ]),
                    h.div(
                        [h.Style({ margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://app.urm.so/domains",
                                    borderRadius: 4,
                                    width: 220,
                                    height: 44,
                                    fontSize: 15,
                                },
                                ["Open Domain Settings"]
                            ),
                        ]
                    ),
                    emailText(
                        {
                            className: "text-muted-foreground",
                            style: {
                                margin: "0",
                                fontSize: "12px",
                                lineHeight: "1.5",
                            },
                        },
                        [
                            "This email was sent because a domain verification event occurred on your URM account.",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
