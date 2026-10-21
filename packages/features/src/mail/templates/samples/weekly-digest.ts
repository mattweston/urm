import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import {
    emailButton,
    emailContainer,
    emailHr,
    emailRow,
    emailText,
} from "./shared.ts"

const h = inertHtml

const digestItem = (title: string, meta: string, value: string): Html =>
    h.table(
        [
            h.Style({
                width: "100%",
                borderCollapse: "collapse",
                borderSpacing: "0",
                marginBottom: "16px",
            }),
        ],
        [
            emailRow([
                {
                    children: [
                        h.p(
                            [
                                h.Class("text-foreground"),
                                h.Style({
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    margin: "0 0 4px 0",
                                }),
                            ],
                            [title]
                        ),
                        h.p(
                            [
                                h.Class("text-muted-foreground"),
                                h.Style({ fontSize: "12px", margin: "0" }),
                            ],
                            [meta]
                        ),
                    ],
                },
                {
                    style: { width: "80px", textAlign: "right" },
                    children: [
                        h.p(
                            [
                                h.Class("text-foreground"),
                                h.Style({
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    margin: "0",
                                }),
                            ],
                            [value]
                        ),
                    ],
                },
            ]),
        ]
    )

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
                                fontSize: "24px",
                                fontWeight: "700",
                                margin: "0 0 8px 0",
                            }),
                        ],
                        ["Your weekly digest"]
                    ),
                    emailText({ style: { margin: "0 0 24px 0" } }, [
                        "Here's a summary of your account activity from the past week.",
                    ]),
                    digestItem(
                        "New sign-ups",
                        "3 users joined your workspace",
                        "+3"
                    ),
                    digestItem(
                        "Active projects",
                        "12 projects had updates",
                        "+2"
                    ),
                    digestItem(
                        "Storage used",
                        "You are at 78% capacity",
                        "7.8 GB"
                    ),
                    digestItem("Team messages", "124 messages sent", "+18"),
                    emailHr({ margin: "24px 0" }),
                    h.p(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "14px",
                                fontWeight: "600",
                                margin: "0 0 8px 0",
                            }),
                        ],
                        ["Top contributors"]
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
                                        width: "32px",
                                        paddingRight: "8px",
                                        paddingBottom: "8px",
                                    },
                                    children: [
                                        h.img([
                                            h.Src(
                                                "https://i.pravatar.cc/64?u=alice"
                                            ),
                                            h.Alt("Alice"),
                                            h.Width("32"),
                                            h.Height("32"),
                                            h.Class("rounded-full"),
                                        ]),
                                    ],
                                },
                                {
                                    style: { paddingBottom: "8px" },
                                    children: [
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    fontSize: "14px",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["Alice Chen"]
                                        ),
                                    ],
                                },
                                {
                                    style: {
                                        textAlign: "right",
                                        paddingBottom: "8px",
                                    },
                                    children: [
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
                                            ["42 commits"]
                                        ),
                                    ],
                                },
                            ]),
                            emailRow([
                                {
                                    style: {
                                        width: "32px",
                                        paddingRight: "8px",
                                        paddingTop: "8px",
                                    },
                                    children: [
                                        h.img([
                                            h.Src(
                                                "https://i.pravatar.cc/64?u=bob"
                                            ),
                                            h.Alt("Bob"),
                                            h.Width("32"),
                                            h.Height("32"),
                                            h.Class("rounded-full"),
                                        ]),
                                    ],
                                },
                                {
                                    style: { paddingTop: "8px" },
                                    children: [
                                        h.p(
                                            [
                                                h.Class("text-foreground"),
                                                h.Style({
                                                    fontSize: "14px",
                                                    margin: "0",
                                                }),
                                            ],
                                            ["Bob Martinez"]
                                        ),
                                    ],
                                },
                                {
                                    style: {
                                        textAlign: "right",
                                        paddingTop: "8px",
                                    },
                                    children: [
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
                                            ["37 commits"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Style({ textAlign: "center", margin: "32px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/dashboard",
                                    borderRadius: 6,
                                    width: 200,
                                    height: 40,
                                    fontSize: 14,
                                },
                                ["View Full Report"]
                            ),
                        ]
                    ),
                    emailHr(),
                    h.p(
                        [
                            h.Class("text-muted-foreground"),
                            h.Style({
                                fontSize: "12px",
                                lineHeight: "18px",
                                margin: "0",
                            }),
                        ],
                        [
                            "You're receiving this because you subscribed to weekly digests. ",
                            h.a(
                                [
                                    h.Href("https://example.com/preferences"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["Manage preferences"]
                            ),
                            ".",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
