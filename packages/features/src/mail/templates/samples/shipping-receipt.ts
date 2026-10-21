import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import {
    emailButton,
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
                    maxWidth: "600px",
                    margin: "0 auto",
                },
                [
                    emailSection(
                        {
                            className: "bg-muted",
                            cellStyle: { padding: "16px" },
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
                                    emailRow([
                                        {
                                            children: [
                                                emailText(
                                                    {
                                                        className:
                                                            "text-foreground font-semibold",
                                                        style: { margin: "0" },
                                                    },
                                                    ["Tracking Number"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-muted-foreground",
                                                        style: {
                                                            margin: "4px 0 0 0",
                                                            fontSize: "14px",
                                                        },
                                                    },
                                                    ["1ZV218970300071628"]
                                                ),
                                            ],
                                        },
                                        {
                                            style: {
                                                textAlign: "right",
                                                verticalAlign: "middle",
                                            },
                                            children: [
                                                h.a(
                                                    [
                                                        h.Href(
                                                            "https://example.com/track"
                                                        ),
                                                        h.Class(
                                                            "text-foreground border-border no-underline inline-block"
                                                        ),
                                                        h.Style({
                                                            border: "1px solid",
                                                            fontSize: "14px",
                                                            padding: "8px 16px",
                                                            textAlign: "center",
                                                        }),
                                                    ],
                                                    ["Track Package"]
                                                ),
                                            ],
                                        },
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.div(
                        [h.Style({ textAlign: "center", padding: "32px 0" })],
                        [
                            h.h1(
                                [
                                    h.Class("text-foreground"),
                                    h.Style({
                                        fontSize: "28px",
                                        fontWeight: "700",
                                        margin: "0 0 16px 0",
                                    }),
                                ],
                                ["It's On Its Way."]
                            ),
                            emailText(
                                { style: { margin: "0", textAlign: "center" } },
                                [
                                    "Your order is on its way. Use the link above to track its progress.",
                                ]
                            ),
                            emailText(
                                {
                                    style: {
                                        margin: "16px 0 0 0",
                                        textAlign: "center",
                                    },
                                },
                                [
                                    "We've also charged your payment method for the cost of your order. For payment details, please visit your Orders page.",
                                ]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.div(
                        [h.Style({ padding: "20px 0" })],
                        [
                            emailText(
                                {
                                    className: "text-foreground font-semibold",
                                    style: { margin: "0" },
                                },
                                ["Shipping to: Bruce Wayne"]
                            ),
                            emailText({ style: { margin: "4px 0 0 0" } }, [
                                "2125 Chestnut St, San Francisco, CA 94123",
                            ]),
                        ]
                    ),
                    emailHr(),
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
                                        width: "120px",
                                        paddingRight: "16px",
                                        verticalAlign: "top",
                                    },
                                    children: [
                                        h.img([
                                            h.Src(
                                                "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=240&h=300&fit=crop"
                                            ),
                                            h.Alt("Product"),
                                            h.Width("120"),
                                            h.Height("150"),
                                            h.Class("rounded-lg"),
                                        ]),
                                    ],
                                },
                                {
                                    style: { verticalAlign: "top" },
                                    children: [
                                        emailText(
                                            {
                                                className:
                                                    "text-foreground font-semibold",
                                                style: { margin: "0" },
                                            },
                                            ["Stadium Away Dri-FIT Jersey"]
                                        ),
                                        emailText(
                                            { style: { margin: "4px 0 0 0" } },
                                            ["Size L (12–14)"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    emailHr(),
                    h.table(
                        [
                            h.Style({
                                width: "100%",
                                borderCollapse: "collapse",
                                borderSpacing: "0",
                                margin: "20px 0",
                            }),
                        ],
                        [
                            emailRow([
                                {
                                    style: { width: "50%" },
                                    children: [
                                        emailText(
                                            {
                                                className:
                                                    "text-foreground font-semibold",
                                                style: { margin: "0" },
                                            },
                                            ["Order Number"]
                                        ),
                                        emailText(
                                            {
                                                className:
                                                    "text-muted-foreground",
                                                style: {
                                                    margin: "4px 0 0 0",
                                                    fontSize: "14px",
                                                },
                                            },
                                            ["C0106373851"]
                                        ),
                                    ],
                                },
                                {
                                    style: { width: "50%" },
                                    children: [
                                        emailText(
                                            {
                                                className:
                                                    "text-foreground font-semibold",
                                                style: { margin: "0" },
                                            },
                                            ["Order Date"]
                                        ),
                                        emailText(
                                            {
                                                className:
                                                    "text-muted-foreground",
                                                style: {
                                                    margin: "4px 0 0 0",
                                                    fontSize: "14px",
                                                },
                                            },
                                            ["Sep 22, 2022"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Style({ textAlign: "center", margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/orders",
                                    borderRadius: 4,
                                    width: 200,
                                    height: 40,
                                    fontSize: 14,
                                },
                                ["Order Status"]
                            ),
                        ]
                    ),
                ],
                { padding: "20px" }
            ),
        ]
    )
