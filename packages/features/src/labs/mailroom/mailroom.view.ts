import { Submodel } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import {
    ChangedComposeBody,
    ChangedComposeSubject,
    ChangedComposeTo,
    CancelledDiscardChanges,
    ClickedArchive,
    ClickedDiscardDraft,
    ClickedMarkRead,
    ClickedReceiveMessage,
    ClickedSaveDraft,
    ClickedSendDraft,
    ClickedToggleStar,
    ConfirmedDiscardChanges,
    RequestedMailroomNavigation,
    type Message,
} from "./mailroom.message.ts"
import {
    folder_icons,
    folder_labels,
    folder_order,
    type FolderId,
    type MailMessage,
    type Model,
} from "./mailroom.model.ts"

export type MailroomHrefs = Readonly<{
    folder: (folder: FolderId) => string
    compose: (draftId?: string) => string
    message: (folder: FolderId, message_id: string) => string
}>

const base = "/labs/mail"
const default_hrefs: MailroomHrefs = {
    folder: (folder) => `${base}/${folder}/`,
    compose: (draft_id = "new") => `${base}/compose/${draft_id}/`,
    message: (folder, message_id) => `${base}/${folder}/${message_id}/`,
}

const navigationControl = (
    href: string,
    message: Message,
    attributes: ReadonlyArray<Attribute<Message>>,
    children: ReadonlyArray<Html | string>,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
) =>
    internal_navigation
        ? h.button(
              [h.Type("button"), h.OnClick(message), ...attributes],
              children
          )
        : h.a([h.Href(href), ...attributes], children)

const buttonView = (
    message: Message,
    class_name: string,
    label: string,
    h: HtmlBuilder<Message>
) =>
    Ui.Button.view(
        {
            onClick: message,
            toView: (attributes) =>
                h.button([...attributes.button, h.Class(class_name)], [label]),
        },
        h
    )

const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat("en-GB", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(timestamp))

const initials = (address: string) => address.slice(0, 2).toUpperCase()

const folderCount = (model: Model, folder: FolderId) =>
    folder === "drafts"
        ? model.drafts.length
        : folder === "outbox"
          ? model.outbox.length
          : model.messages.filter((message) =>
                folder === "starred"
                    ? message.starred
                    : message.folder === folder
            ).length

const shell = (
    model: Model,
    active: FolderId,
    content: Html,
    hrefs: MailroomHrefs,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
) =>
    h.main(
        [
            h.Class(
                "mx-auto w-full max-w-6xl overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex h-[72px] items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-6"
                    ),
                ],
                [
                    navigationControl(
                        hrefs.folder("inbox"),
                        RequestedMailroomNavigation({
                            href: default_hrefs.folder("inbox"),
                        }),
                        [
                            h.Class("flex items-center gap-3 no-underline"),
                            h.AriaLabel("Mailroom inbox"),
                        ],
                        [
                            h.span(
                                [
                                    h.AriaHidden(true),
                                    h.Class(
                                        "grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground"
                                    ),
                                ],
                                ["M"]
                            ),
                            h.span(
                                [h.Class("leading-tight")],
                                [
                                    h.strong(
                                        [
                                            h.Class(
                                                "block text-sm font-bold text-foreground"
                                            ),
                                        ],
                                        ["Mailroom"]
                                    ),
                                    h.small(
                                        [
                                            h.Class(
                                                "block text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["Local-first demo"]
                                    ),
                                ]
                            ),
                        ],
                        internal_navigation,
                        h
                    ),
                    h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            h.span(
                                [
                                    h.Attribute("role", "status"),
                                    h.Class(
                                        "flex items-center gap-1.5 rounded-[var(--radius-surface)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                                    ),
                                ],
                                [h.span([h.AriaHidden(true)], ["●"]), "Online"]
                            ),
                            h.span(
                                [
                                    h.AriaLabel("Signed in as Avery Stone"),
                                    h.Class(
                                        "grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
                                    ),
                                ],
                                ["AS"]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid md:grid-cols-[13rem_minmax(0,1fr)]")],
                [
                    h.aside(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border p-3 md:border-r md:border-b-0"
                            ),
                        ],
                        [
                            navigationControl(
                                hrefs.compose(),
                                RequestedMailroomNavigation({
                                    href: default_hrefs.compose(),
                                }),
                                [
                                    h.Class(
                                        "mb-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground no-underline hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                [
                                    h.span([h.AriaHidden(true)], ["＋"]),
                                    "Compose",
                                ],
                                internal_navigation,
                                h
                            ),
                            h.nav(
                                [
                                    h.AriaLabel("Mailboxes"),
                                    h.Class(
                                        "grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-1"
                                    ),
                                ],
                                folder_order.map((folder) =>
                                    navigationControl(
                                        hrefs.folder(folder),
                                        RequestedMailroomNavigation({
                                            href: default_hrefs.folder(folder),
                                        }),
                                        [
                                            h.Class(
                                                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm no-underline ${
                                                    folder === active
                                                        ? "bg-accent font-semibold text-accent-foreground"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                }`
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.AriaHidden(true),
                                                    h.Class(
                                                        "w-4 shrink-0 text-center"
                                                    ),
                                                ],
                                                [folder_icons[folder]]
                                            ),
                                            h.span(
                                                [h.Class("flex-1 truncate")],
                                                [folder_labels[folder]]
                                            ),
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-xs tabular-nums opacity-70"
                                                    ),
                                                ],
                                                [
                                                    String(
                                                        folderCount(
                                                            model,
                                                            folder
                                                        )
                                                    ),
                                                ]
                                            ),
                                        ],
                                        internal_navigation,
                                        h
                                    )
                                )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-3 hidden gap-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 md:grid"
                                    ),
                                ],
                                [
                                    h.strong(
                                        [h.Class("text-xs")],
                                        ["Local-first mailbox"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "text-xs leading-relaxed text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Changes are stored locally and replayed on reload.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.section([h.Class("min-w-0")], [content]),
                ]
            ),
        ]
    )

const emptyView = (message: string, h: HtmlBuilder<Message>) =>
    h.div(
        [
            h.Class(
                "grid min-h-[24rem] place-items-center p-8 text-sm text-muted-foreground"
            ),
        ],
        [message]
    )

const messageRow = (
    folder: FolderId,
    message: MailMessage,
    hrefs: MailroomHrefs,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
) =>
    h.keyed("li")(
        message.id,
        [
            h.Class(
                `flex items-start gap-3 border-b border-border px-5 py-[18px] last:border-b-0 ${
                    message.read ? "" : "bg-accent/40"
                }`
            ),
        ],
        [
            h.span(
                [
                    h.AriaHidden(true),
                    h.Class(
                        "grid size-[38px] shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground"
                    ),
                ],
                [initials(message.sender)]
            ),
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    navigationControl(
                        hrefs.message(folder, message.id),
                        RequestedMailroomNavigation({
                            href: default_hrefs.message(folder, message.id),
                        }),
                        [h.Class("block no-underline")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-3 text-xs"
                                    ),
                                ],
                                [
                                    h.strong(
                                        [
                                            h.Class(
                                                `truncate text-foreground ${
                                                    message.read
                                                        ? "font-medium"
                                                        : "font-extrabold"
                                                }`
                                            ),
                                        ],
                                        [message.sender]
                                    ),
                                    h.time(
                                        [
                                            h.Class(
                                                "shrink-0 text-muted-foreground"
                                            ),
                                        ],
                                        [formatDate(message.received_at)]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        `mt-2 truncate text-[13px] text-foreground ${
                                            message.read
                                                ? "font-semibold opacity-70"
                                                : "font-extrabold"
                                        }`
                                    ),
                                ],
                                [message.subject]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-1 truncate text-xs text-muted-foreground"
                                    ),
                                ],
                                [message.body]
                            ),
                        ],
                        internal_navigation,
                        h
                    ),
                    h.div(
                        [h.Class("mt-2.5 flex flex-wrap gap-2")],
                        [
                            Ui.Button.view(
                                {
                                    onClick: ClickedToggleStar({
                                        id: message.id,
                                    }),
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.AriaPressed(
                                                    message.starred
                                                        ? "true"
                                                        : "false"
                                                ),
                                                h.Class(
                                                    "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                ),
                                            ],
                                            [
                                                message.starred
                                                    ? "★ Starred"
                                                    : "☆ Star",
                                            ]
                                        ),
                                },
                                h
                            ),
                            message.read
                                ? h.empty
                                : buttonView(
                                      ClickedMarkRead({ id: message.id }),
                                      "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent [box-shadow:var(--shadow-control)]",
                                      "Mark read",
                                      h
                                  ),
                            message.folder === "archive"
                                ? h.empty
                                : buttonView(
                                      ClickedArchive({ id: message.id }),
                                      "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent [box-shadow:var(--shadow-control)]",
                                      "Archive",
                                      h
                                  ),
                        ]
                    ),
                ]
            ),
        ]
    )

const mailboxContent = (
    folder: FolderId,
    count: number,
    body: Html,
    footerLabel: string,
    model: Model,
    h: HtmlBuilder<Message>
) =>
    h.div(
        [h.Class("flex min-h-[28rem] flex-col")],
        [
            h.header(
                [
                    h.Class(
                        "flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-6 py-5"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary"
                                    ),
                                ],
                                ["Mailroom"]
                            ),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                [folder_labels[folder]]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "grid h-[30px] min-w-[30px] place-items-center rounded-[9px] bg-muted px-2 text-xs font-bold text-muted-foreground"
                                    ),
                                ],
                                [String(count)]
                            ),
                            buttonView(
                                ClickedReceiveMessage(),
                                "rounded-[var(--radius-control)] bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]",
                                "Receive",
                                h
                            ),
                        ]
                    ),
                ]
            ),
            model.loaded
                ? body
                : h.div(
                      [
                          h.Class(
                              "grid min-h-[24rem] flex-1 place-items-center px-6 py-12 text-center"
                          ),
                      ],
                      [
                          h.div(
                              [h.Class("grid justify-items-center gap-2")],
                              [
                                  h.span(
                                      [
                                          h.AriaHidden(true),
                                          h.Class(
                                              "size-8 animate-spin rounded-full border-2 border-border border-t-primary"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.p(
                                      [
                                          h.Attribute("role", "status"),
                                          h.Class(
                                              "mt-2 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Replaying the mailbox…"]
                                  ),
                              ]
                          ),
                      ]
                  ),
            h.footer(
                [
                    h.Class(
                        "flex items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border px-6 py-3 text-xs text-muted-foreground"
                    ),
                ],
                [
                    footerLabel,
                    model.loaded ? "status: ready" : "status: loading",
                ]
            ),
        ]
    )

export const mailboxView = (
    model: Model,
    folder: FolderId,
    h: HtmlBuilder<Message>,
    hrefs: MailroomHrefs = default_hrefs,
    internal_navigation = false
): Html => {
    if (folder === "drafts") {
        const content =
            model.drafts.length === 0
                ? emptyView("No saved drafts.", h)
                : h.ol(
                      [],
                      model.drafts.map((draft) =>
                          h.keyed("li")(
                              draft.id,
                              [
                                  h.Class(
                                      "border-b-(length:--surface-border-width) border-border"
                                  ),
                              ],
                              [
                                  navigationControl(
                                      hrefs.compose(draft.id),
                                      RequestedMailroomNavigation({
                                          href: default_hrefs.compose(draft.id),
                                      }),
                                      [
                                          h.Class(
                                              "block px-5 py-4 hover:bg-accent border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                          ),
                                      ],
                                      [
                                          h.strong(
                                              [],
                                              [draft.to || "No recipient"]
                                          ),
                                          h.p(
                                              [h.Class("mt-1 text-sm")],
                                              [
                                                  draft.subject ||
                                                      "Untitled draft",
                                              ]
                                          ),
                                          h.p(
                                              [
                                                  h.Class(
                                                      "mt-1 truncate text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              [draft.body || "Empty message"]
                                          ),
                                      ],
                                      internal_navigation,
                                      h
                                  ),
                              ]
                          )
                      )
                  )
        return shell(
            model,
            folder,
            mailboxContent(
                folder,
                model.drafts.length,
                content,
                `${model.drafts.length} drafts`,
                model,
                h
            ),
            hrefs,
            internal_navigation,
            h
        )
    }

    if (folder === "outbox") {
        const content =
            model.outbox.length === 0
                ? emptyView("Nothing is waiting to be sent.", h)
                : h.ol(
                      [],
                      model.outbox.map((item) =>
                          h.keyed("li")(
                              item.id,
                              [
                                  h.Class(
                                      "border-b-(length:--surface-border-width) border-border px-5 py-4"
                                  ),
                              ],
                              [
                                  h.strong([], [item.to]),
                                  h.p(
                                      [h.Class("mt-1 text-sm")],
                                      [item.subject]
                                  ),
                              ]
                          )
                      )
                  )
        return shell(
            model,
            folder,
            mailboxContent(
                folder,
                model.outbox.length,
                content,
                `${model.outbox.length} queued`,
                model,
                h
            ),
            hrefs,
            internal_navigation,
            h
        )
    }

    const messages = model.messages
        .filter((message) =>
            folder === "starred" ? message.starred : message.folder === folder
        )
        .sort((left, right) => right.received_at - left.received_at)
    return shell(
        model,
        folder,
        mailboxContent(
            folder,
            messages.length,
            messages.length === 0
                ? emptyView(`No messages in ${folder_labels[folder]}.`, h)
                : h.ol(
                      [h.Class("max-h-[32rem] flex-1 overflow-auto")],
                      messages.map((message) =>
                          messageRow(
                              folder,
                              message,
                              hrefs,
                              internal_navigation,
                              h
                          )
                      )
                  ),
            `${messages.filter((message) => !message.read).length} unread`,
            model,
            h
        ),
        hrefs,
        internal_navigation,
        h
    )
}

export const detailView = (
    model: Model,
    folder: FolderId,
    messageId: string,
    h: HtmlBuilder<Message>,
    hrefs: MailroomHrefs = default_hrefs,
    internal_navigation = false
): Html => {
    const message = model.messages.find(({ id }) => id === messageId)
    if (message === undefined) {
        return shell(
            model,
            folder,
            emptyView("Message not found.", h),
            hrefs,
            internal_navigation,
            h
        )
    }
    return shell(
        model,
        folder,
        h.article(
            [h.Class("flex min-h-[28rem] flex-col")],
            [
                h.header(
                    [
                        h.Class(
                            "flex items-start justify-between gap-4 border-b-(length:--surface-border-width) border-border px-6 py-5"
                        ),
                    ],
                    [
                        h.div(
                            [h.Class("min-w-0")],
                            [
                                navigationControl(
                                    hrefs.folder(folder),
                                    RequestedMailroomNavigation({
                                        href: default_hrefs.folder(folder),
                                    }),
                                    [
                                        h.Class(
                                            "mb-1.5 inline-block text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary no-underline"
                                        ),
                                    ],
                                    ["← Back to mailbox"],
                                    internal_navigation,
                                    h
                                ),
                                h.h2(
                                    [h.Class("truncate text-lg font-semibold")],
                                    [message.subject]
                                ),
                            ]
                        ),
                    ]
                ),
                h.div(
                    [h.Class("flex-1 px-6 py-5")],
                    [
                        h.div(
                            [
                                h.Class(
                                    "flex items-center gap-3 border-b-(length:--surface-border-width) border-border pb-4"
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.AriaHidden(true),
                                        h.Class(
                                            "grid size-[38px] shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground"
                                        ),
                                    ],
                                    [initials(message.sender)]
                                ),
                                h.div(
                                    [h.Class("min-w-0 flex-1")],
                                    [
                                        h.strong(
                                            [
                                                h.Class(
                                                    "block truncate text-sm font-bold"
                                                ),
                                            ],
                                            [message.sender]
                                        ),
                                        h.time(
                                            [
                                                h.Class(
                                                    "block text-xs text-muted-foreground"
                                                ),
                                            ],
                                            [formatDate(message.received_at)]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                        h.p(
                            [
                                h.Class(
                                    "whitespace-pre-wrap py-5 text-sm leading-relaxed"
                                ),
                            ],
                            [message.body]
                        ),
                        h.div(
                            [
                                h.Class(
                                    "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border pt-4"
                                ),
                            ],
                            [
                                Ui.Button.view(
                                    {
                                        onClick: ClickedToggleStar({
                                            id: message.id,
                                        }),
                                        toView: (attributes) =>
                                            h.button(
                                                [
                                                    ...attributes.button,
                                                    h.AriaPressed(
                                                        message.starred
                                                            ? "true"
                                                            : "false"
                                                    ),
                                                    h.Class(
                                                        "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                [
                                                    message.starred
                                                        ? "★ Starred"
                                                        : "☆ Star",
                                                ]
                                            ),
                                    },
                                    h
                                ),
                                message.read
                                    ? h.empty
                                    : buttonView(
                                          ClickedMarkRead({ id: message.id }),
                                          "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent [box-shadow:var(--shadow-control)]",
                                          "Mark read",
                                          h
                                      ),
                                message.folder === "archive"
                                    ? h.empty
                                    : buttonView(
                                          ClickedArchive({ id: message.id }),
                                          "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent [box-shadow:var(--shadow-control)]",
                                          "Archive",
                                          h
                                      ),
                            ]
                        ),
                    ]
                ),
            ]
        ),
        hrefs,
        internal_navigation,
        h
    )
}

export const composeView = (
    model: Model,
    h: HtmlBuilder<Message>,
    hrefs: MailroomHrefs = default_hrefs,
    internal_navigation = false
): Html => {
    const fieldClass =
        "w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm"
    const compose = shell(
        model,
        "drafts",
        h.div(
            [],
            [
                h.header(
                    [
                        h.Class(
                            "border-b-(length:--surface-border-width) border-border px-6 py-5"
                        ),
                    ],
                    [
                        h.h1(
                            [h.Class("text-xl font-semibold")],
                            [
                                model.compose_draft_id === "new"
                                    ? "New message"
                                    : "Saved draft",
                            ]
                        ),
                        h.p(
                            [h.Class("mt-1 text-xs text-muted-foreground")],
                            [
                                model.compose_dirty
                                    ? "Unsaved changes"
                                    : model.submission === "saved"
                                      ? "Saved"
                                      : "Ready",
                            ]
                        ),
                    ]
                ),
                h.div(
                    [h.Class("grid gap-4 p-6")],
                    [
                        Ui.Input.view(
                            {
                                id: "mailroom-compose-to",
                                type: "email",
                                value: model.compose_to,
                                onInput: (value) => ChangedComposeTo({ value }),
                                toView: (attributes) =>
                                    h.label(
                                        [
                                            ...attributes.label,
                                            h.Class(
                                                "grid gap-1.5 text-sm font-medium"
                                            ),
                                        ],
                                        [
                                            "To",
                                            h.input([
                                                ...attributes.input,
                                                h.Class(fieldClass),
                                            ]),
                                        ]
                                    ),
                            },
                            h
                        ),
                        Ui.Input.view(
                            {
                                id: "mailroom-compose-subject",
                                value: model.compose_subject,
                                onInput: (value) =>
                                    ChangedComposeSubject({ value }),
                                toView: (attributes) =>
                                    h.label(
                                        [
                                            ...attributes.label,
                                            h.Class(
                                                "grid gap-1.5 text-sm font-medium"
                                            ),
                                        ],
                                        [
                                            "Subject",
                                            h.input([
                                                ...attributes.input,
                                                h.Class(fieldClass),
                                            ]),
                                        ]
                                    ),
                            },
                            h
                        ),
                        Ui.Textarea.view(
                            {
                                id: "mailroom-compose-message",
                                value: model.compose_body,
                                onInput: (value) =>
                                    ChangedComposeBody({ value }),
                                toView: (attributes) =>
                                    h.label(
                                        [
                                            ...attributes.label,
                                            h.Class(
                                                "grid gap-1.5 text-sm font-medium"
                                            ),
                                        ],
                                        [
                                            "Message",
                                            h.textarea([
                                                ...attributes.textarea,
                                                h.Class(
                                                    `${fieldClass} min-h-48 resize-y`
                                                ),
                                            ]),
                                        ]
                                    ),
                            },
                            h
                        ),
                        model.error === ""
                            ? h.empty
                            : h.p(
                                  [
                                      h.Attribute(
                                          "role",
                                          model.submission === "failed"
                                              ? "alert"
                                              : "status"
                                      ),
                                      h.Class(
                                          model.submission === "failed"
                                              ? "text-sm text-destructive"
                                              : "text-sm text-muted-foreground"
                                      ),
                                  ],
                                  [model.error]
                              ),
                        h.div(
                            [h.Class("flex flex-wrap gap-2")],
                            [
                                buttonView(
                                    ClickedSaveDraft(),
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-semibold bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                                    "Save draft",
                                    h
                                ),
                                buttonView(
                                    ClickedSendDraft(),
                                    "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]",
                                    "Send now",
                                    h
                                ),
                                buttonView(
                                    ClickedDiscardDraft(),
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive",
                                    "Discard",
                                    h
                                ),
                            ]
                        ),
                    ]
                ),
            ]
        ),
        hrefs,
        internal_navigation,
        h
    )
    if (model.pending_href === "") {
        return compose
    }
    return h.div(
        [],
        [
            compose,
            h.div(
                [
                    h.Class(
                        "fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
                    ),
                ],
                [
                    h.section(
                        [
                            h.Attribute("role", "dialog"),
                            h.AriaModal(true),
                            h.Class(
                                "grid w-full max-w-sm gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 [box-shadow:var(--shadow-overlay)]"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.AriaHidden(true),
                                    h.Class("text-2xl text-primary"),
                                ],
                                ["◇"]
                            ),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Leave this draft?"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Your latest edits have not been saved."]
                            ),
                            h.div(
                                [h.Class("mt-1 flex gap-2")],
                                [
                                    buttonView(
                                        CancelledDiscardChanges(),
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3.5 py-2 text-sm font-semibold",
                                        "Keep writing",
                                        h
                                    ),
                                    buttonView(
                                        ConfirmedDiscardChanges(),
                                        "rounded-[var(--radius-control)] bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]",
                                        "Discard changes",
                                        h
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

export type ViewRoute =
    | { readonly _tag: "Mailbox"; readonly folder: FolderId }
    | {
          readonly _tag: "Message"
          readonly folder: FolderId
          readonly messageId: string
      }
    | { readonly _tag: "Compose" }

export const view = Submodel.defineView<
    Model,
    Message,
    {
        readonly route: ViewRoute
        readonly folderHref?: MailroomHrefs["folder"]
        readonly composeHref?: MailroomHrefs["compose"]
        readonly messageHref?: MailroomHrefs["message"]
        readonly internalNavigation?: boolean
    }
>(
    (
        model,
        { route, folderHref, composeHref, messageHref, internalNavigation },
        h
    ) => {
        const hrefs: MailroomHrefs = {
            folder: folderHref ?? default_hrefs.folder,
            compose: composeHref ?? default_hrefs.compose,
            message: messageHref ?? default_hrefs.message,
        }

        switch (route._tag) {
            case "Mailbox":
                return mailboxView(
                    model,
                    route.folder,
                    h,
                    hrefs,
                    internalNavigation ?? false
                )
            case "Message":
                return detailView(
                    model,
                    route.folder,
                    route.messageId,
                    h,
                    hrefs,
                    internalNavigation ?? false
                )
            case "Compose":
                return composeView(model, h, hrefs, internalNavigation ?? false)
        }
    }
)
