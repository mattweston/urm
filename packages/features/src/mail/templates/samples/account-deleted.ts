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
                    h.h1(
                        [
                            h.Class("text-foreground"),
                            h.Style({
                                fontSize: "24px",
                                fontWeight: "700",
                                margin: "0 0 16px 0",
                            }),
                        ],
                        ["Account deleted"]
                    ),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "We're confirming that your account and all associated data have been permanently deleted from our platform.",
                    ]),
                    emailText({ style: { margin: "0 0 16px 0" } }, [
                        "Deletion request received: ",
                        h.span([h.Class("font-semibold")], ["Jun 8, 2026"]),
                    ]),
                    emailText({ style: { margin: "0 0 24px 0" } }, [
                        "If you deleted your account by mistake, you have ",
                        h.span([h.Class("font-semibold")], ["14 days"]),
                        " to restore it before the data is permanently purged from our systems.",
                    ]),
                    h.div(
                        [h.Style({ margin: "24px 0" })],
                        [
                            emailButton(
                                {
                                    href: "https://example.com/restore",
                                    borderRadius: 6,
                                    width: 200,
                                    height: 40,
                                    fontSize: 14,
                                },
                                ["Restore Account"]
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
                            "We're sorry to see you go. If you have any feedback, we'd love to hear it at ",
                            h.a(
                                [
                                    h.Href("mailto:feedback@example.com"),
                                    h.Class("text-primary no-underline"),
                                ],
                                ["feedback@example.com"]
                            ),
                            ".",
                        ]
                    ),
                ],
                { padding: "40px" }
            ),
        ]
    )
