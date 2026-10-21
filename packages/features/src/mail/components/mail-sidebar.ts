import { Array, Option } from "effect"
import { type Html, type HtmlBuilder } from "foldkit/html"
import { mailFolderLinks, mailTopicLinks } from "./mail-data.ts"
import { contactsHref, templatesHref } from "../platform/route.ts"

export const mailSidebarView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.aside(
        [
            h.Class(
                "flex h-full min-h-0 flex-col gap-5 overflow-hidden border-r-(length:--surface-border-width) border-border bg-card/60 p-4 text-card-foreground lg:p-5"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold"
                                    ),
                                ],
                                ["U"]
                            ),
                            h.div(
                                [h.Class("min-w-0")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "truncate text-sm font-semibold"
                                            ),
                                        ],
                                        ["Urm Mail"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "truncate text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["UI prototype"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href(contactsHref()),
                            h.Class(
                                "mt-4 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-4 text-sm font-medium text-card-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Contacts"]
                    ),
                    h.a(
                        [
                            h.Href(templatesHref()),
                            h.Class(
                                "mt-2 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-4 text-sm font-medium text-card-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Templates"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "mt-4 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Compose"]
                    ),
                ]
            ),
            navGroup<ParentMessage>("Folders", mailFolderLinks, h),
            navGroup<ParentMessage>("Topics", mailTopicLinks, h),
        ]
    )
}

const navGroup = <ParentMessage>(
    title: string,
    items: ReadonlyArray<{ title: string; label: string }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeFirstItem = Array.head(items)

    return h.section(
        [h.Class("space-y-3 overflow-auto")],
        [
            h.div(
                [
                    h.Class(
                        "px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    ),
                ],
                [title]
            ),
            h.div(
                [h.Class("space-y-1")],
                items.map((item) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                Option.match(maybeFirstItem, {
                                    onNone: () =>
                                        "flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                                    onSome: (firstItem) =>
                                        item === firstItem
                                            ? "flex w-full items-center justify-between rounded-[var(--radius-surface)] bg-muted px-3 py-2 text-sm font-medium text-foreground"
                                            : "flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                                })
                            ),
                        ],
                        [
                            h.span([], [item.title]),
                            h.span(
                                [
                                    h.Class(
                                        "inline-flex min-w-7 items-center justify-center rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                [item.label]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}
