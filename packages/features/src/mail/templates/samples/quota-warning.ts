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
                                margin: "0 0 24px 0",
                            }),
                        ],
                        ["You're nearing your limit"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "You've used ",
                        h.strong([h.Class("text-foreground")], ["42,000"]),
                        " of your ",
                        h.strong([h.Class("text-foreground")], ["50,000"]),
                        " monthly quota.",
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
                                    h.strong(
                                        [h.Class("text-primary")],
                                        ["Heads up:"]
                                    ),
                                    " you're at approximately 84% of your limit.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Style({ margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/billing",
                                    borderRadius: 4,
                                    width: 200,
                                    height: 44,
                                    fontSize: 15,
                                },
                                ["Upgrade Plan"]
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
                            "Consider upgrading your plan to avoid any interruption to your service.",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
