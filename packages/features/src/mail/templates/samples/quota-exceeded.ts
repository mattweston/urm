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
                        ["You've reached your limit"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "You've reached your monthly limit of ",
                        h.strong([h.Class("text-foreground")], ["50,000"]),
                        " requests.",
                    ]),
                    emailSection(
                        {
                            className:
                                "bg-muted border-(length:--surface-border-width) border-destructive",
                            cellStyle: {
                                padding: "12px 16px",
                                borderRadius: "4px",
                            },
                        },
                        [
                            emailText(
                                {
                                    className: "text-destructive",
                                    style: { margin: "0", fontSize: "14px" },
                                },
                                [
                                    "Usage is temporarily paused until your limit resets or your plan is upgraded.",
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
                                ["Manage Plan"]
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
                        ["Upgrade your plan to restore access immediately."]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
