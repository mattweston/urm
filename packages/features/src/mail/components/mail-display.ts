import { type Html, type HtmlBuilder } from "foldkit/html"
import type { Mail } from "./mail-data.ts"

type MailDisplayProps<ParentMessage> = {
    mail: Mail | null
    mutedThread: boolean
    onToggleMute: () => ParentMessage
}

export const mailDisplayView = <ParentMessage>(
    props: MailDisplayProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (props.mail === null) {
        return h.section(
            [
                h.Class(
                    "flex h-full min-h-0 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                ),
            ],
            [
                h.div(
                    [h.Class("text-sm text-muted-foreground")],
                    ["No message selected"]
                ),
            ]
        )
    }

    const mail = props.mail

    return h.section(
        [
            h.Class(
                "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-center gap-2 border-b-(length:--surface-border-width) border-border p-3"
                    ),
                ],
                [
                    actionButton<ParentMessage>("Archive", h),
                    actionButton<ParentMessage>("Trash", h),
                    actionButton<ParentMessage>("Snooze", h),
                    h.div([h.Class("mx-1 h-6 w-px bg-border")], []),
                    actionButton<ParentMessage>("Reply", h),
                    actionButton<ParentMessage>("Reply all", h),
                    actionButton<ParentMessage>("Forward", h),
                    h.div([h.Class("mx-1 h-6 w-px bg-border")], []),
                    actionButton<ParentMessage>("More", h),
                ]
            ),
            h.div(
                [h.Class("min-h-0 flex-1 overflow-auto")],
                [
                    h.div(
                        [h.Class("flex items-start gap-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                                    ),
                                ],
                                [initials(mail.name)]
                            ),
                            h.div(
                                [h.Class("min-w-0 flex-1")],
                                [
                                    h.div(
                                        [h.Class("text-lg font-semibold")],
                                        [mail.name]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "truncate text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [mail.subject]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "truncate text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Reply-To:"]
                                            ),
                                            " ",
                                            mail.email,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "shrink-0 text-xs text-muted-foreground"
                                    ),
                                ],
                                [formatDate(mail.date)]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        []
                    ),
                    h.div(
                        [
                            h.Class(
                                "whitespace-pre-wrap p-5 text-sm leading-6 text-foreground"
                            ),
                        ],
                        [mail.text]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        []
                    ),
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-4")],
                                [
                                    h.textarea([
                                        h.Placeholder(`Reply ${mail.name}...`),
                                        h.Class(
                                            "min-h-32 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background p-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
                                        ),
                                    ]),
                                    muteSwitchView<ParentMessage>(
                                        props.mutedThread,
                                        props.onToggleMute,
                                        h
                                    ),
                                    h.div(
                                        [h.Class("flex items-center")],
                                        [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Class(
                                                        "ml-auto inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                ["Send"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const muteSwitchView = <ParentMessage>(
    mutedThread: boolean,
    onToggleMute: () => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex items-center gap-3")],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Role("switch"),
                    h.OnClick(onToggleMute()),
                    h.Class(
                        mutedThread
                            ? "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-primary transition-colors border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            : "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class(
                                mutedThread
                                    ? "pointer-events-none inline-block h-4 w-4 translate-x-6 rounded-full bg-background shadow transition-transform"
                                    : "pointer-events-none inline-block h-4 w-4 translate-x-1 rounded-full bg-background shadow transition-transform"
                            ),
                        ],
                        []
                    ),
                ]
            ),
            h.div(
                [],
                [
                    h.div(
                        [h.Class("text-sm font-normal text-foreground")],
                        ["Mute this thread"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Stop notifications for replies in this conversation."]
                    ),
                ]
            ),
        ]
    )
}

const actionButton = <ParentMessage>(
    label: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.button(
        [
            h.Type("button"),
            h.Class(
                "inline-flex h-9 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
            ),
        ],
        [label]
    )
}

const initials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value))
