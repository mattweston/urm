import { type Html, type HtmlBuilder } from "foldkit/html"
import type { Mail } from "./mail-data.ts"

type MailListProps<ParentMessage> = {
    mails: ReadonlyArray<Mail>
    selectedMailId: string
    filter: "all" | "unread"
    search: string
    onSelectMail: (mailId: string) => ParentMessage
    onFilterChanged: (filter: "all" | "unread") => ParentMessage
    onSearchChanged: (value: string) => ParentMessage
}

export const mailListView = <ParentMessage>(
    props: MailListProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const filteredMails = props.mails.filter((mail) => {
        const matchesFilter = props.filter === "all" || !mail.read
        const query = props.search.trim().toLowerCase()
        const matchesSearch =
            query.length === 0 ||
            mail.name.toLowerCase().includes(query) ||
            mail.subject.toLowerCase().includes(query) ||
            mail.text.toLowerCase().includes(query)

        return matchesFilter && matchesSearch
    })

    return h.section(
        [
            h.Class(
                "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b-(length:--surface-border-width) border-border p-4"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Inbox"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "ml-auto inline-flex rounded-[var(--radius-surface)] bg-muted p-1"
                                    ),
                                ],
                                [
                                    filterButton<ParentMessage>(
                                        "All mail",
                                        "all",
                                        props,
                                        h
                                    ),
                                    filterButton<ParentMessage>(
                                        "Unread",
                                        "unread",
                                        props,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label([h.Class("sr-only")], ["Search mail"]),
                            h.input([
                                h.Type("search"),
                                h.Value(props.search),
                                h.AriaLabel("Search mail"),
                                h.Placeholder("Search mail"),
                                h.OnInput((value) =>
                                    props.onSearchChanged(value)
                                ),
                                h.Class(
                                    "h-10 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                                ),
                            ]),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("min-h-0 flex-1 overflow-auto p-2")],
                [
                    filteredMails.length === 0
                        ? h.div(
                              [
                                  h.Class(
                                      "flex h-full items-center justify-center p-10 text-sm text-muted-foreground"
                                  ),
                              ],
                              ["No mail matches the current filters."]
                          )
                        : h.div(
                              [h.Class("flex flex-col gap-2")],
                              filteredMails.map((mail) =>
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              props.onSelectMail(mail.id)
                                          ),
                                          h.Class(
                                              mail.id === props.selectedMailId
                                                  ? "flex flex-col items-start gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-muted p-4 text-left [box-shadow:var(--shadow-surface)] transition-colors"
                                                  : "flex flex-col items-start gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 text-left transition-colors hover:border-border/70 hover:bg-accent"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "flex w-full items-center gap-3"
                                                  ),
                                              ],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                                                          ),
                                                      ],
                                                      [initials(mail.name)]
                                                  ),
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "min-w-0 flex-1"
                                                          ),
                                                      ],
                                                      [
                                                          h.div(
                                                              [
                                                                  h.Class(
                                                                      "flex items-center gap-2"
                                                                  ),
                                                              ],
                                                              [
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "truncate font-semibold"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          mail.name,
                                                                      ]
                                                                  ),
                                                                  mail.read
                                                                      ? h.empty
                                                                      : h.span(
                                                                            [
                                                                                h.Class(
                                                                                    "size-2 rounded-full bg-primary"
                                                                                ),
                                                                            ],
                                                                            []
                                                                        ),
                                                              ]
                                                          ),
                                                          h.div(
                                                              [
                                                                  h.Class(
                                                                      "truncate text-xs font-medium text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [mail.subject]
                                                          ),
                                                      ]
                                                  ),
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "text-xs text-muted-foreground"
                                                          ),
                                                      ],
                                                      [timeAgo(mail.date)]
                                                  ),
                                              ]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "line-clamp-2 text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              [truncateText(mail.text, 220)]
                                          ),
                                          h.div(
                                              [h.Class("flex flex-wrap gap-2")],
                                              mail.labels.map((label) =>
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              label === "work"
                                                                  ? "inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary [box-shadow:var(--shadow-control)]"
                                                                  : "inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                          ),
                                                      ],
                                                      [label]
                                                  )
                                              )
                                          ),
                                      ]
                                  )
                              )
                          ),
                ]
            ),
        ]
    )
}

const filterButton = <ParentMessage>(
    label: string,
    filter: "all" | "unread",
    props: Pick<MailListProps<ParentMessage>, "filter" | "onFilterChanged">,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const active = props.filter === filter

    return h.button(
        [
            h.Type("button"),
            h.OnClick(props.onFilterChanged(filter)),
            h.Class(
                active
                    ? "rounded-[var(--radius-surface)] bg-background px-3 py-1.5 text-sm font-medium text-foreground [box-shadow:var(--shadow-surface)]"
                    : "rounded-[var(--radius-control)] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
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

const truncateText = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max).trim()}...` : value

const timeAgo = (value: string) => {
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
    let interval = seconds / 31536000

    if (interval > 1) return rtf.format(-Math.floor(interval), "year")
    interval = seconds / 2592000
    if (interval > 1) return rtf.format(-Math.floor(interval), "month")
    interval = seconds / 86400
    if (interval > 1) return rtf.format(-Math.floor(interval), "day")
    interval = seconds / 3600
    if (interval > 1) return rtf.format(-Math.floor(interval), "hour")
    interval = seconds / 60
    if (interval > 1) return rtf.format(-Math.floor(interval), "minute")

    return rtf.format(-Math.floor(interval), "second")
}
