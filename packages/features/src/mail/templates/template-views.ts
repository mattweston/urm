import { Array } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"
import {
    productionEmailTemplatePreviews,
    type EmailTemplatePreview,
} from "@urm/email/templates"
import { allSamples } from "./samples/index.ts"
import {
    emailButton,
    emailContainer,
    emailHr,
    emailRow,
    emailSection,
    emailText,
} from "./samples/shared.ts"

const h = inertHtml

const productionPreviewByTemplateId = (
    template: EmailTemplatePreview
): (() => Html) => {
    const matchingSample = allSamples.find((sample) => {
        if (template.id === "auth_email_verification") {
            return sample.id === "sample-confirm-email"
        }

        if (template.id === "auth_password_reset") {
            return sample.id === "sample-reset-password"
        }

        if (template.id === "auth_password_changed") {
            return sample.id === "sample-new-device-login"
        }

        if (template.id === "newsletter_basic") {
            return sample.id === "sample-weekly-digest"
        }

        return false
    })

    return matchingSample?.view ?? (() => h.div([], []))
}

export interface Template {
    id: string
    name: string
    category: string
    view: () => Html
}

// ARTICLES

const articleCardView = (): Html =>
    emailContainer(
        {},
        [
            h.img([
                h.Src(
                    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=300&fit=crop"
                ),
                h.Alt("Article thumbnail"),
                h.Width("600"),
                h.Height("300"),
                h.Class("block w-full"),
            ]),
            emailText(
                {
                    className:
                        "text-xs font-semibold uppercase tracking-wide text-primary",
                    style: { margin: "16px 0 0 0" },
                },
                ["TECHNOLOGY • 5 MIN READ"]
            ),
            h.a(
                [
                    h.Href("https://example.com/article"),
                    h.Class("block no-underline"),
                ],
                [
                    emailText(
                        {
                            className: "text-lg font-semibold text-foreground",
                            style: { margin: "8px 0 0 0" },
                        },
                        ["10 Tips for Building Better Email Templates"]
                    ),
                ]
            ),
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: { margin: "8px 0 0 0" },
                },
                [
                    "Learn the best practices for creating responsive, accessible email templates that look great in every inbox.",
                ]
            ),
            h.a(
                [
                    h.Href("https://example.com/article"),
                    h.Class(
                        "inline-block text-sm font-medium text-primary no-underline"
                    ),
                    h.Style({ marginTop: "12px" }),
                ],
                ["Read more →"]
            ),
        ],
        { padding: "16px" }
    )

const articleListView = (): Html =>
    emailContainer(
        {},
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
                            style: { width: "80px", paddingRight: "16px" },
                            children: [
                                h.img([
                                    h.Src(
                                        "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=100&h=100&fit=crop"
                                    ),
                                    h.Alt("Article 1"),
                                    h.Width("80"),
                                    h.Height("80"),
                                    h.Class("rounded-lg"),
                                ]),
                            ],
                        },
                        {
                            children: [
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Mar 15, 2024"]
                                ),
                                h.a(
                                    [
                                        h.Href("https://example.com/article-1"),
                                        h.Class("no-underline"),
                                    ],
                                    [
                                        emailText(
                                            {
                                                className:
                                                    "text-sm font-semibold text-foreground",
                                                style: { margin: "4px 0 0 0" },
                                            },
                                            [
                                                "Getting Started with Email Design",
                                            ]
                                        ),
                                    ]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    [
                                        "A beginner's guide to creating beautiful email templates.",
                                    ]
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
                    }),
                ],
                [
                    emailRow([
                        {
                            style: { width: "80px", paddingRight: "16px" },
                            children: [
                                h.img([
                                    h.Src(
                                        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop"
                                    ),
                                    h.Alt("Article 2"),
                                    h.Width("80"),
                                    h.Height("80"),
                                    h.Class("rounded-lg"),
                                ]),
                            ],
                        },
                        {
                            children: [
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Mar 12, 2024"]
                                ),
                                h.a(
                                    [
                                        h.Href("https://example.com/article-2"),
                                        h.Class("no-underline"),
                                    ],
                                    [
                                        emailText(
                                            {
                                                className:
                                                    "text-sm font-semibold text-foreground",
                                                style: { margin: "4px 0 0 0" },
                                            },
                                            ["Advanced Layout Techniques"]
                                        ),
                                    ]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    [
                                        "Master complex email layouts with these pro tips.",
                                    ]
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
                    }),
                ],
                [
                    emailRow([
                        {
                            style: { width: "80px", paddingRight: "16px" },
                            children: [
                                h.img([
                                    h.Src(
                                        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop"
                                    ),
                                    h.Alt("Article 3"),
                                    h.Width("80"),
                                    h.Height("80"),
                                    h.Class("rounded-lg"),
                                ]),
                            ],
                        },
                        {
                            children: [
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Mar 10, 2024"]
                                ),
                                h.a(
                                    [
                                        h.Href("https://example.com/article-3"),
                                        h.Class("no-underline"),
                                    ],
                                    [
                                        emailText(
                                            {
                                                className:
                                                    "text-sm font-semibold text-foreground",
                                                style: { margin: "4px 0 0 0" },
                                            },
                                            ["Responsive Email Best Practices"]
                                        ),
                                    ]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    [
                                        "Ensure your emails look great on any device.",
                                    ]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ],
        { padding: "24px" }
    )

// AVATARS

const basicCircularAvatarView = (): Html =>
    emailContainer(
        {},
        [
            h.img([
                h.Src("https://i.pravatar.cc/96?u=john"),
                h.Alt("John Doe"),
                h.Width("48"),
                h.Height("48"),
                h.Class("inline-block rounded-full align-middle"),
            ]),
        ],
        { padding: "24px", textAlign: "center" }
    )

const avatarWithDescriptionView = (): Html =>
    emailContainer(
        {},
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
                            style: { width: "48px", paddingRight: "12px" },
                            children: [
                                h.img([
                                    h.Src("https://i.pravatar.cc/96?u=mike"),
                                    h.Alt("Mike Johnson"),
                                    h.Width("48"),
                                    h.Height("48"),
                                    h.Class("rounded-full"),
                                ]),
                            ],
                        },
                        {
                            children: [
                                emailText(
                                    {
                                        className:
                                            "text-sm font-semibold text-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Mike Johnson"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Software Engineer"]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ],
        { padding: "24px" }
    )

// ECOMMERCE

const productPriceCardView = (): Html =>
    emailContainer(
        {},
        [
            emailText(
                {
                    className:
                        "text-xs font-semibold uppercase tracking-wide text-primary",
                    style: { margin: "0", textAlign: "center" },
                },
                ["Limited Time Offer"]
            ),
            h.p(
                [
                    h.Class("m-0 text-4xl font-bold text-foreground"),
                    h.Style({ textAlign: "center", marginTop: "16px" }),
                ],
                ["$79"]
            ),
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: { margin: "0", textAlign: "center" },
                },
                [
                    h.span(
                        [h.Style({ textDecoration: "line-through" })],
                        ["$99"]
                    ),
                    " — Save 20%",
                ]
            ),
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: {
                        margin: "0",
                        textAlign: "center",
                        marginTop: "16px",
                    },
                },
                ["Includes lifetime access and free updates"]
            ),
            h.div(
                [h.Style({ textAlign: "center", marginTop: "24px" })],
                [
                    emailButton(
                        {
                            href: "https://example.com/buy",
                            borderRadius: 8,
                            width: 200,
                            height: 48,
                            fontSize: 16,
                        },
                        ["Buy Now"]
                    ),
                ]
            ),
            emailText(
                {
                    className: "text-xs text-muted-foreground",
                    style: {
                        margin: "0",
                        textAlign: "center",
                        marginTop: "16px",
                    },
                },
                ["30-day money-back guarantee"]
            ),
        ],
        { padding: "24px", textAlign: "center" }
    )

const pricingComparisonView = (): Html =>
    emailContainer(
        {},
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
                            style: { width: "50%", paddingRight: "8px" },
                            children: [
                                emailSection(
                                    {
                                        className: "bg-card",
                                        cellStyle: { padding: "20px" },
                                    },
                                    [
                                        emailText(
                                            {
                                                className:
                                                    "text-lg font-semibold text-foreground",
                                                style: { margin: "0" },
                                            },
                                            ["Starter"]
                                        ),
                                        emailText(
                                            {
                                                className:
                                                    "text-sm text-muted-foreground",
                                                style: { margin: "4px 0 0 0" },
                                            },
                                            ["For individuals"]
                                        ),
                                        h.p(
                                            [
                                                h.Class("m-0 text-foreground"),
                                                h.Style({ marginTop: "16px" }),
                                            ],
                                            [
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-3xl font-bold"
                                                        ),
                                                    ],
                                                    ["$9"]
                                                ),
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["/month"]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [h.Style({ marginTop: "16px" })],
                                            [
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: {
                                                            margin: "0 0 8px 0",
                                                        },
                                                    },
                                                    ["✓  5 projects"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: {
                                                            margin: "0 0 8px 0",
                                                        },
                                                    },
                                                    ["✓  10GB storage"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: { margin: "0" },
                                                    },
                                                    ["✓  Email support"]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [h.Style({ marginTop: "20px" })],
                                            [
                                                emailButton(
                                                    {
                                                        href: "https://example.com/starter",
                                                        borderRadius: 6,
                                                        width: 140,
                                                        height: 40,
                                                        fontSize: 14,
                                                    },
                                                    ["Get Started"]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                            ],
                        },
                        {
                            style: { width: "50%", paddingLeft: "8px" },
                            children: [
                                emailSection(
                                    {
                                        className: "bg-muted",
                                        cellStyle: { padding: "20px" },
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
                                                                        "text-lg font-semibold text-foreground",
                                                                    style: {
                                                                        margin: "0",
                                                                    },
                                                                },
                                                                ["Pro"]
                                                            ),
                                                        ],
                                                    },
                                                    {
                                                        style: {
                                                            textAlign: "right",
                                                        },
                                                        children: [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "rounded-full bg-primary px-2 py-1 text-xs font-medium text-background border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                                    ),
                                                                ],
                                                                ["Popular"]
                                                            ),
                                                        ],
                                                    },
                                                ]),
                                            ]
                                        ),
                                        emailText(
                                            {
                                                className:
                                                    "text-sm text-muted-foreground",
                                                style: { margin: "4px 0 0 0" },
                                            },
                                            ["For teams"]
                                        ),
                                        h.p(
                                            [
                                                h.Class("m-0 text-foreground"),
                                                h.Style({ marginTop: "16px" }),
                                            ],
                                            [
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-3xl font-bold"
                                                        ),
                                                    ],
                                                    ["$29"]
                                                ),
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["/month"]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [h.Style({ marginTop: "16px" })],
                                            [
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: {
                                                            margin: "0 0 8px 0",
                                                        },
                                                    },
                                                    ["✓  Unlimited projects"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: {
                                                            margin: "0 0 8px 0",
                                                        },
                                                    },
                                                    ["✓  100GB storage"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: {
                                                            margin: "0 0 8px 0",
                                                        },
                                                    },
                                                    ["✓  Priority support"]
                                                ),
                                                emailText(
                                                    {
                                                        className:
                                                            "text-sm text-muted-foreground",
                                                        style: { margin: "0" },
                                                    },
                                                    ["✓  Advanced analytics"]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [h.Style({ marginTop: "20px" })],
                                            [
                                                emailButton(
                                                    {
                                                        href: "https://example.com/pro",
                                                        borderRadius: 6,
                                                        width: 140,
                                                        height: 40,
                                                        fontSize: 14,
                                                    },
                                                    ["Upgrade to Pro"]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ],
        { padding: "0" }
    )

// FEEDBACK

const starRatingView = (): Html =>
    emailContainer(
        {},
        [
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: { margin: "0", textAlign: "center" },
                },
                ["How would you rate your experience?"]
            ),
            h.div(
                [h.Style({ textAlign: "center", marginTop: "8px" })],
                Array.makeBy(5, (i) =>
                    h.a(
                        [
                            h.Href(`https://example.com/rate?stars=${i + 1}`),
                            h.Class("text-2xl no-underline"),
                            h.Style({ margin: "0 4px" }),
                        ],
                        ["⭐"]
                    )
                )
            ),
        ],
        { padding: "24px", textAlign: "center" }
    )

const emojiFeedbackView = (): Html =>
    emailSection(
        {
            className: "bg-muted",
            cellStyle: { padding: "24px", textAlign: "center" },
        },
        [
            emailText(
                {
                    className: "text-sm font-medium text-foreground",
                    style: { margin: "0 0 16px 0" },
                },
                ["How was your experience today?"]
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
                            style: { textAlign: "center" },
                            children: [
                                h.a(
                                    [
                                        h.Href(
                                            "https://example.com/feedback?rating=bad"
                                        ),
                                        h.Class("text-3xl no-underline"),
                                    ],
                                    ["😞"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    ["Bad"]
                                ),
                            ],
                        },
                        {
                            style: { textAlign: "center" },
                            children: [
                                h.a(
                                    [
                                        h.Href(
                                            "https://example.com/feedback?rating=okay"
                                        ),
                                        h.Class("text-3xl no-underline"),
                                    ],
                                    ["😐"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    ["Okay"]
                                ),
                            ],
                        },
                        {
                            style: { textAlign: "center" },
                            children: [
                                h.a(
                                    [
                                        h.Href(
                                            "https://example.com/feedback?rating=good"
                                        ),
                                        h.Class("text-3xl no-underline"),
                                    ],
                                    ["😊"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    ["Good"]
                                ),
                            ],
                        },
                        {
                            style: { textAlign: "center" },
                            children: [
                                h.a(
                                    [
                                        h.Href(
                                            "https://example.com/feedback?rating=great"
                                        ),
                                        h.Class("text-3xl no-underline"),
                                    ],
                                    ["😍"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-xs text-muted-foreground",
                                        style: { margin: "4px 0 0 0" },
                                    },
                                    ["Great"]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ]
    )

// GALLERY

const singleImageView = (): Html =>
    emailSection({ cellStyle: { padding: "16px" } }, [
        h.img([
            h.Src(
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"
            ),
            h.Alt("Mountain landscape"),
            h.Width("600"),
            h.Height("400"),
            h.Class("block w-full rounded-lg"),
        ]),
    ])

const imageGridView = (): Html =>
    emailSection({ cellStyle: { padding: "0" } }, [
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
                            width: "50%",
                            paddingRight: "4px",
                            paddingBottom: "4px",
                        },
                        children: [
                            h.img([
                                h.Src(
                                    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=200&fit=crop"
                                ),
                                h.Alt("Travel 1"),
                                h.Width("300"),
                                h.Height("200"),
                                h.Class("block w-full rounded-lg"),
                            ]),
                        ],
                    },
                    {
                        style: {
                            width: "50%",
                            paddingLeft: "4px",
                            paddingBottom: "4px",
                        },
                        children: [
                            h.img([
                                h.Src(
                                    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300&h=200&fit=crop"
                                ),
                                h.Alt("Travel 2"),
                                h.Width("300"),
                                h.Height("200"),
                                h.Class("block w-full rounded-lg"),
                            ]),
                        ],
                    },
                ]),
                emailRow([
                    {
                        style: {
                            width: "50%",
                            paddingRight: "4px",
                            paddingTop: "4px",
                        },
                        children: [
                            h.img([
                                h.Src(
                                    "https://images.unsplash.com/photo-1476900543704-4312b78632f8?w=300&h=200&fit=crop"
                                ),
                                h.Alt("Travel 3"),
                                h.Width("300"),
                                h.Height("200"),
                                h.Class("block w-full rounded-lg"),
                            ]),
                        ],
                    },
                    {
                        style: {
                            width: "50%",
                            paddingLeft: "4px",
                            paddingTop: "4px",
                        },
                        children: [
                            h.img([
                                h.Src(
                                    "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=300&h=200&fit=crop"
                                ),
                                h.Alt("Travel 4"),
                                h.Width("300"),
                                h.Height("200"),
                                h.Class("block w-full rounded-lg"),
                            ]),
                        ],
                    },
                ]),
            ]
        ),
    ])

// MARKETING

const heroSectionView = (): Html =>
    emailSection(
        {
            className: "bg-foreground",
            cellStyle: { padding: "48px 24px", textAlign: "center" },
        },
        [
            h.h1(
                [h.Class("m-0 text-3xl font-bold text-background")],
                ["Welcome to Our Platform"]
            ),
            emailText(
                {
                    className: "text-background",
                    style: {
                        margin: "16px 0 0 0",
                        textAlign: "center",
                        opacity: "0.8",
                    },
                },
                [
                    "Build beautiful emails with ease. Our platform helps you create stunning email templates in minutes.",
                ]
            ),
            h.div(
                [h.Style({ textAlign: "center", marginTop: "24px" })],
                [
                    emailButton(
                        {
                            href: "https://example.com/get-started",
                            borderRadius: 8,
                            width: 160,
                            height: 44,
                            fontSize: 14,
                        },
                        ["Get Started"]
                    ),
                ]
            ),
        ]
    )

const newsletterCtaView = (): Html =>
    emailSection(
        {
            className: "bg-muted",
            cellStyle: { padding: "32px 24px", textAlign: "center" },
        },
        [
            h.h2(
                [h.Class("m-0 text-xl font-bold text-foreground")],
                ["Stay in the loop"]
            ),
            emailText(
                {
                    className: "text-muted-foreground",
                    style: { margin: "8px 0 0 0", textAlign: "center" },
                },
                ["Subscribe to our newsletter for the latest updates and tips."]
            ),
            h.div(
                [h.Style({ textAlign: "center", marginTop: "16px" })],
                [
                    emailButton(
                        {
                            href: "https://example.com/subscribe",
                            borderRadius: 6,
                            width: 150,
                            height: 40,
                            fontSize: 14,
                        },
                        ["Subscribe Now"]
                    ),
                ]
            ),
        ]
    )

// SURVEYS

const satisfactionSurveyView = (): Html =>
    emailContainer(
        {},
        [
            h.h2(
                [h.Class("m-0 text-xl font-bold text-foreground")],
                [
                    "How satisfied were you overall with the initial conversation about your claim?",
                ]
            ),
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: { margin: "12px 0 0 0" },
                },
                [
                    "Your feedback is important to us and it will be used to better serve our customers.",
                ]
            ),
            h.div(
                [h.Style({ marginTop: "40px" })],
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
                                                    "text-xs text-muted-foreground",
                                                style: { margin: "0" },
                                            },
                                            ["Dissatisfied"]
                                        ),
                                    ],
                                },
                                {
                                    style: { textAlign: "right" },
                                    children: [
                                        emailText(
                                            {
                                                className:
                                                    "text-xs text-muted-foreground",
                                                style: { margin: "0" },
                                            },
                                            ["Satisfied"]
                                        ),
                                    ],
                                },
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Style({ textAlign: "center", marginTop: "8px" })],
                        Array.makeBy(5, (i) =>
                            h.a(
                                [
                                    h.Href(
                                        `https://example.com/rate?score=${i + 1}`
                                    ),
                                    h.Class(
                                        "inline-block text-center font-medium text-background bg-primary no-underline"
                                    ),
                                    h.Style({
                                        width: "44px",
                                        height: "44px",
                                        lineHeight: "44px",
                                        borderRadius: "8px",
                                        fontSize: "16px",
                                        margin: "0 4px",
                                    }),
                                ],
                                [`${i + 1}`]
                            )
                        )
                    ),
                ]
            ),
            h.div(
                [h.Style({ marginTop: "40px", textAlign: "center" })],
                [
                    emailHr(),
                    emailText(
                        {
                            className: "text-xs text-muted-foreground",
                            style: { margin: "0" },
                        },
                        ["Customer Experience Research Team"]
                    ),
                ]
            ),
        ],
        { padding: "40px" }
    )

const surveySectionView = (): Html =>
    emailContainer(
        {},
        [
            emailText(
                {
                    className: "text-sm font-semibold text-primary",
                    style: { margin: "0", textAlign: "center" },
                },
                ["Your opinion matters"]
            ),
            h.h2(
                [
                    h.Class("m-0 text-2xl font-bold text-foreground"),
                    h.Style({ textAlign: "center", marginTop: "8px" }),
                ],
                ["We want to hear you"]
            ),
            emailText(
                {
                    className: "text-sm text-muted-foreground",
                    style: { margin: "12px 0 0 0", textAlign: "center" },
                },
                [
                    "How would you rate your experience using our product in a scale from 1 to 5?",
                ]
            ),
            h.div(
                [h.Style({ textAlign: "center", marginTop: "24px" })],
                Array.makeBy(5, (i) =>
                    h.a(
                        [
                            h.Href(`https://example.com/rate?score=${i + 1}`),
                            h.Class(
                                "inline-block text-center font-medium bg-background border-(length:--surface-border-width) border-primary text-primary no-underline"
                            ),
                            h.Style({
                                width: "40px",
                                height: "40px",
                                lineHeight: "38px",
                                borderRadius: "8px",
                                fontSize: "14px",
                                margin: "0 4px",
                            }),
                        ],
                        [`${i + 1}`]
                    )
                )
            ),
        ],
        { padding: "40px", textAlign: "center" }
    )

// TESTIMONIALS

const testimonialSimpleCenteredView = (): Html =>
    emailContainer(
        {},
        [
            emailText(
                {
                    className: "text-base text-foreground",
                    style: {
                        margin: "0",
                        textAlign: "center",
                        lineHeight: "1.625",
                    },
                },
                [
                    "Design is not just what it looks like and feels like. Design is how it works. The people who are crazy enough to think they can change the world are the ones who do. Innovation distinguishes between a leader and a follower.",
                ]
            ),
            h.table(
                [
                    h.Style({
                        width: "auto",
                        borderCollapse: "collapse",
                        borderSpacing: "0",
                        margin: "24px auto 0",
                    }),
                ],
                [
                    emailRow([
                        {
                            style: {
                                paddingRight: "8px",
                                verticalAlign: "middle",
                            },
                            children: [
                                h.img([
                                    h.Src(
                                        "https://i.pravatar.cc/96?u=ericawang"
                                    ),
                                    h.Alt("Erica Wang"),
                                    h.Width("40"),
                                    h.Height("40"),
                                    h.Class("rounded-full"),
                                ]),
                            ],
                        },
                        {
                            style: {
                                textAlign: "left",
                                verticalAlign: "middle",
                            },
                            children: [
                                emailText(
                                    {
                                        className:
                                            "text-sm font-semibold text-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Erica Wang"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-sm text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Co-founder of Circle"]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ],
        { padding: "48px", textAlign: "center" }
    )

const testimonialWithLargeAvatarView = (): Html =>
    emailContainer(
        {},
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
                            style: { width: "180px", paddingRight: "24px" },
                            children: [
                                h.img([
                                    h.Src(
                                        "https://i.pravatar.cc/300?u=ericawang"
                                    ),
                                    h.Alt("Erica Wang"),
                                    h.Width("180"),
                                    h.Height("220"),
                                    h.Class(
                                        "block rounded-[var(--radius-surface)] object-cover"
                                    ),
                                ]),
                            ],
                        },
                        {
                            children: [
                                emailText(
                                    {
                                        className: "text-base text-foreground",
                                        style: {
                                            margin: "0",
                                            lineHeight: "1.625",
                                        },
                                    },
                                    [
                                        "Design is not just what it looks like and feels like. Design is how it works. The people who are crazy enough to think they can change the world are the ones who do. Innovation distinguishes between a leader and a follower.",
                                    ]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-sm font-semibold text-foreground",
                                        style: { margin: "24px 0 0 0" },
                                    },
                                    ["Erica Wang"]
                                ),
                                emailText(
                                    {
                                        className:
                                            "text-sm text-muted-foreground",
                                        style: { margin: "0" },
                                    },
                                    ["Co-founder of Circle"]
                                ),
                            ],
                        },
                    ]),
                ]
            ),
        ],
        { padding: "48px" }
    )

// REGISTRY

const productionEmailTemplateView =
    (template: EmailTemplatePreview) => (): Html =>
        h.div(
            [h.Class("space-y-4")],
            [
                emailContainer(
                    {},
                    [
                        emailText(
                            {
                                className:
                                    "text-xs font-semibold uppercase tracking-wide text-primary",
                                style: { margin: "0 0 8px 0" },
                            },
                            [template.id]
                        ),
                        h.h1(
                            [
                                h.Class("text-foreground"),
                                h.Style({
                                    fontSize: "28px",
                                    lineHeight: "34px",
                                    margin: "0 0 16px 0",
                                }),
                            ],
                            [template.sample.subject]
                        ),
                        productionPreviewByTemplateId(template)(),
                    ],
                    { padding: "24px" }
                ),
                emailContainer(
                    {},
                    [
                        emailText({ style: { margin: "0 0 8px 0" } }, [
                            "HTML source",
                        ]),
                        h.pre(
                            [
                                h.Class(
                                    "overflow-auto rounded-[var(--radius-surface)] bg-muted p-3 text-xs text-foreground"
                                ),
                                h.Style({ whiteSpace: "pre-wrap" }),
                            ],
                            [template.sample.html ?? ""]
                        ),
                    ],
                    { padding: "24px" }
                ),
                emailContainer(
                    {},
                    [
                        emailText({ style: { margin: "0 0 8px 0" } }, [
                            "Plain text",
                        ]),
                        h.pre(
                            [
                                h.Class(
                                    "overflow-auto rounded-[var(--radius-surface)] bg-muted p-3 text-xs text-foreground"
                                ),
                                h.Style({ whiteSpace: "pre-wrap" }),
                            ],
                            [template.sample.text]
                        ),
                    ],
                    { padding: "24px" }
                ),
            ]
        )

const productionTemplates: ReadonlyArray<Template> =
    productionEmailTemplatePreviews.map((template) => ({
        id: `production-${template.id}`,
        name: template.name,
        category: `Production ${template.category}`,
        view: productionEmailTemplateView(template),
    }))

export const blockTemplates: ReadonlyArray<Template> = [
    {
        id: "article-card",
        name: "Article Card",
        category: "Articles",
        view: articleCardView,
    },
    {
        id: "article-list",
        name: "Article List",
        category: "Articles",
        view: articleListView,
    },
    {
        id: "basic-avatar",
        name: "Basic Circular Avatar",
        category: "Avatars",
        view: basicCircularAvatarView,
    },
    {
        id: "avatar-with-desc",
        name: "Avatar with Description",
        category: "Avatars",
        view: avatarWithDescriptionView,
    },
    {
        id: "product-price",
        name: "Product Price Card",
        category: "Ecommerce",
        view: productPriceCardView,
    },
    {
        id: "pricing-comparison",
        name: "Pricing Comparison",
        category: "Ecommerce",
        view: pricingComparisonView,
    },
    {
        id: "star-rating",
        name: "Star Rating",
        category: "Feedback",
        view: starRatingView,
    },
    {
        id: "emoji-feedback",
        name: "Emoji Feedback",
        category: "Feedback",
        view: emojiFeedbackView,
    },
    {
        id: "single-image",
        name: "Single Image",
        category: "Gallery",
        view: singleImageView,
    },
    {
        id: "image-grid",
        name: "Image Grid",
        category: "Gallery",
        view: imageGridView,
    },
    {
        id: "hero-section",
        name: "Hero Section",
        category: "Marketing",
        view: heroSectionView,
    },
    {
        id: "newsletter-cta",
        name: "Newsletter CTA",
        category: "Marketing",
        view: newsletterCtaView,
    },
    {
        id: "satisfaction-survey",
        name: "Satisfaction Survey",
        category: "Surveys",
        view: satisfactionSurveyView,
    },
    {
        id: "survey-section",
        name: "Survey Section",
        category: "Surveys",
        view: surveySectionView,
    },
    {
        id: "testimonial-centered",
        name: "Testimonial Centered",
        category: "Testimonials",
        view: testimonialSimpleCenteredView,
    },
    {
        id: "testimonial-large-avatar",
        name: "Testimonial with Large Avatar",
        category: "Testimonials",
        view: testimonialWithLargeAvatarView,
    },
]

export const allTemplates: ReadonlyArray<Template> = [
    ...productionTemplates,
    ...blockTemplates,
    ...allSamples.map((sample) => ({
        id: sample.id,
        name: sample.name,
        category: sample.category,
        view: sample.view,
    })),
]

export const templateById = (id: string): Template | null =>
    allTemplates.find((template) => template.id === id) ?? null

export const categories: ReadonlyArray<string> = [
    ...new Set(allTemplates.map((template) => template.category)),
]
