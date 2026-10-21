import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import { emailContainer, emailHr, emailRow } from "./shared.ts"

const h = inertHtml

export const view = (): Html =>
    h.div(
        [h.Class("mx-auto max-w-[600px] bg-muted py-8 px-4")],
        [
            emailContainer(
                {
                    maxWidth: "660px",
                    margin: "0 auto",
                },
                [
                    h.table(
                        [
                            h.Style({
                                width: "100%",
                                borderCollapse: "collapse",
                                borderSpacing: "0",
                            }),
                        ],
                        [
                            h.tr(
                                [],
                                [
                                    h.td(
                                        [h.Style({ paddingBottom: "24px" })],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "bg-foreground text-background"
                                                    ),
                                                    h.Style({
                                                        width: "42px",
                                                        height: "42px",
                                                        borderRadius: "8px",
                                                        lineHeight: "42px",
                                                        fontSize: "10px",
                                                        fontWeight: "700",
                                                        textAlign: "center",
                                                        letterSpacing: "1px",
                                                    }),
                                                ],
                                                ["LOGO"]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [
                                            h.Style({
                                                textAlign: "right",
                                                paddingBottom: "24px",
                                            }),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                    h.Style({
                                                        fontSize: "32px",
                                                        fontWeight: "300",
                                                        margin: "0",
                                                    }),
                                                ],
                                                ["Receipt"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.table(
                        [
                            h.Class("bg-muted"),
                            h.Style({
                                width: "100%",
                                borderCollapse: "collapse",
                                borderSpacing: "0",
                                borderRadius: "3px",
                                fontSize: "12px",
                                marginBottom: "24px",
                            }),
                        ],
                        [
                            emailRow([
                                {
                                    style: {
                                        padding: "10px 0 10px 20px",
                                        borderStyle: "solid",
                                        borderColor: "transparent",
                                        borderWidth: "0px 1px 1px 0px",
                                        verticalAlign: "middle",
                                    },
                                    children: [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-muted-foreground"
                                                ),
                                                h.Style({
                                                    fontSize: "10px",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["ACCOUNT"]
                                        ),
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    margin: "0",
                                                    fontSize: "12px",
                                                }),
                                            ],
                                            ["bruce@example.com"]
                                        ),
                                    ],
                                },
                            ]),
                            emailRow([
                                {
                                    style: {
                                        padding: "10px 0 10px 20px",
                                        borderStyle: "solid",
                                        borderColor: "transparent",
                                        borderWidth: "0px 1px 1px 0px",
                                        verticalAlign: "middle",
                                    },
                                    children: [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-muted-foreground"
                                                ),
                                                h.Style({
                                                    fontSize: "10px",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["INVOICE DATE"]
                                        ),
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    margin: "0",
                                                    fontSize: "12px",
                                                }),
                                            ],
                                            ["18 Jan 2023"]
                                        ),
                                    ],
                                },
                                {
                                    style: {
                                        padding: "10px 0 10px 20px",
                                        borderStyle: "solid",
                                        borderColor: "transparent",
                                        borderWidth: "0px 1px 1px 0px",
                                        verticalAlign: "middle",
                                    },
                                    children: [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-muted-foreground"
                                                ),
                                                h.Style({
                                                    fontSize: "10px",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["ORDER ID"]
                                        ),
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    margin: "0",
                                                    fontSize: "12px",
                                                }),
                                            ],
                                            ["ML4F5L8522"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
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
                                    style: {
                                        width: "64px",
                                        paddingRight: "22px",
                                    },
                                    children: [
                                        h.div(
                                            [
                                                h.Class(
                                                    "bg-muted text-muted-foreground"
                                                ),
                                                h.Style({
                                                    width: "64px",
                                                    height: "64px",
                                                    borderRadius: "14px",
                                                    border: "1px solid",
                                                    lineHeight: "64px",
                                                    fontSize: "10px",
                                                    textAlign: "center",
                                                }),
                                            ],
                                            ["ICON"]
                                        ),
                                    ],
                                },
                                {
                                    children: [
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    margin: "0 0 4px 0",
                                                }),
                                            ],
                                            ["Pro Plan Subscription"]
                                        ),
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-muted-foreground"
                                                ),
                                                h.Style({
                                                    fontSize: "12px",
                                                    margin: "0 0 4px 0",
                                                }),
                                            ],
                                            ["Monthly Renewal"]
                                        ),
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
                                            ["Renews Feb 18, 2023"]
                                        ),
                                    ],
                                },
                                {
                                    style: {
                                        width: "100px",
                                        textAlign: "right",
                                    },
                                    children: [
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["$14.99"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    emailHr({ margin: "30px 0" }),
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
                                    style: { textAlign: "right" },
                                    children: [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-muted-foreground"
                                                ),
                                                h.Style({
                                                    fontSize: "10px",
                                                    fontWeight: "600",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["TOTAL"]
                                        ),
                                    ],
                                },
                                {
                                    style: {
                                        width: "90px",
                                        textAlign: "right",
                                    },
                                    children: [
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    fontSize: "16px",
                                                    fontWeight: "600",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["$14.99"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    emailHr({ margin: "30px 0 75px 0" }),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                margin: "0 0 16px 0",
                                lineHeight: "1.5",
                            }),
                        ],
                        [
                            "Questions? Contact our support team at ",
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
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                margin: "0",
                                textAlign: "center",
                            }),
                        ],
                        [
                            "Copyright 2023 Your Company, Inc. ",
                            h.a(
                                [
                                    h.Href("https://example.com/legal"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["All rights reserved"]
                            ),
                        ]
                    ),
                ],
                { padding: "20px" }
            ),
        ]
    )
