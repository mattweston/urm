import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import {
    emailContainer,
    emailHr,
    emailRow,
    emailSection,
    emailText,
} from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    border: "1px solid",
                    borderRadius: "6px",
                    maxWidth: "610px",
                    margin: "0 auto",
                },
                [
                    h.div(
                        [h.Style({ padding: "24px 40px" })],
                        [
                            emailText(
                                {
                                    className: "text-primary font-bold",
                                    style: {
                                        margin: "0",
                                        fontSize: "14px",
                                        lineHeight: "26px",
                                        textTransform: "uppercase",
                                    },
                                },
                                ["Developer Update"]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.div(
                        [h.Style({ padding: "0 40px" })],
                        [
                            emailText({ style: { margin: "0 0 16px 0" } }, [
                                "Hello Developer,",
                            ]),
                            emailText({ style: { margin: "0 0 16px 0" } }, [
                                "We strive to make our platform a safe and trusted experience for users. We've added clarifications to our ",
                                h.a(
                                    [
                                        h.Href("https://example.com/policy"),
                                        h.Class("text-primary underline"),
                                    ],
                                    ["Target API Level policy"]
                                ),
                                ".",
                            ]),
                            emailText({ style: { margin: "0 0 16px 0" } }, [
                                "We're noting exceptions to the policy, which can be found in our updated ",
                                h.a(
                                    [
                                        h.Href("https://example.com/help"),
                                        h.Class("text-primary underline"),
                                    ],
                                    ["Help Center article"]
                                ),
                                ". These exceptions include permanently private apps and apps that target automotive or wearables form factors.",
                            ]),
                            emailText({ style: { margin: "0 0 16px 0" } }, [
                                "We're also extending the deadline to give you more time to adjust to these changes. Apps that target API level 29 or below will start experiencing reduced distribution starting ",
                                h.strong(
                                    [h.Class("text-foreground")],
                                    ["Jan 31, 2023"]
                                ),
                                " instead of Nov 1, 2022.",
                            ]),
                        ]
                    ),
                    emailHr(),
                    h.div(
                        [h.Style({ padding: "0 40px 24px" })],
                        [
                            emailText({ style: { margin: "0 0 8px 0" } }, [
                                "Thank you,",
                            ]),
                            h.p(
                                [
                                    h.Class("text-foreground"),
                                    h.Style({
                                        fontSize: "20px",
                                        margin: "0",
                                        fontWeight: "500",
                                    }),
                                ],
                                ["The Platform Team"]
                            ),
                        ]
                    ),
                    emailSection(
                        {
                            className: "bg-muted",
                            cellStyle: { padding: "16px 40px" },
                        },
                        [
                            emailText(
                                {
                                    className: "text-muted-foreground",
                                    style: {
                                        margin: "0 0 8px 0",
                                        fontSize: "14px",
                                    },
                                },
                                ["Connect with us"]
                            ),
                            h.table(
                                [
                                    h.Style({
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        borderSpacing: "0",
                                    }),
                                ],
                                [
                                    emailRow([
                                        {
                                            children: [
                                                h.a(
                                                    [
                                                        h.Href(
                                                            "https://example.com"
                                                        ),
                                                        h.Class(
                                                            "text-primary no-underline"
                                                        ),
                                                    ],
                                                    ["Community"]
                                                ),
                                            ],
                                        },
                                        {
                                            style: { textAlign: "center" },
                                            children: [
                                                h.a(
                                                    [
                                                        h.Href(
                                                            "https://example.com/docs"
                                                        ),
                                                        h.Class(
                                                            "text-primary no-underline"
                                                        ),
                                                    ],
                                                    ["Documentation"]
                                                ),
                                            ],
                                        },
                                        {
                                            style: { textAlign: "right" },
                                            children: [
                                                h.a(
                                                    [
                                                        h.Href(
                                                            "https://example.com/support"
                                                        ),
                                                        h.Class(
                                                            "text-primary no-underline"
                                                        ),
                                                    ],
                                                    ["Support"]
                                                ),
                                            ],
                                        },
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Style({ padding: "24px 40px" })],
                        [
                            h.p(
                                [
                                    h.Class("text-muted-foreground"),
                                    h.Style({
                                        fontSize: "12px",
                                        lineHeight: "18px",
                                        textAlign: "center",
                                        margin: "0",
                                    }),
                                ],
                                [
                                    "You have received this mandatory email service announcement to update you about important changes to your developer account.",
                                ]
                            ),
                        ]
                    ),
                ],
                { padding: "0" }
            ),
        ]
    )
